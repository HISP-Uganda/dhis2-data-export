import { LoadingOutlined, DownloadOutlined } from "@ant-design/icons";
import { useDataEngine } from "@dhis2/app-runtime";
import {
  Link,
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  retainSearchParams,
} from "@tanstack/react-router";
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Select,
  Spin,
  Table,
  TableColumnsType,
} from "antd";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import "antd/dist/reset.css";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import { fromPairs, isEmpty } from "lodash";
import React, { FC, useState } from "react";
import { utils, write } from "xlsx";
import { z } from "zod";
import {
  EventsResponse,
  OrganisationUnitsResponse,
  Program,
  ProgramsResponse,
} from "./types";

const queryClient = new QueryClient();

const { RangePicker } = DatePicker;

function s2ab(s: any) {
  let buf = new ArrayBuffer(s.length);
  let view = new Uint8Array(buf);
  for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
  return buf;
}

const rootRoute = createRootRouteWithContext<{
  engine: ReturnType<typeof useDataEngine>;
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    );
  },
  loader: async ({ context: { engine } }) => {
    const {
      programs: { programs },
      organisationUnits: { organisationUnits },
    } = (await engine.query({
      programs: {
        resource: "programs.json",
        params: {
          filter: "programType:eq:WITHOUT_REGISTRATION",
          fields:
            "id,name,programStages[id,programStageDataElements[dataElement[id,name]]]",
        },
      },
      organisationUnits: {
        resource: "organisationUnits.json",
        params: {
          filter: "leaf:eq:true",
          fields:
            "id,name,level,parent[id,name,level,parent[id,name,level,parent[id,name,level,parent[id,name,level]]]]",
          paging: "false",
        },
      },
    })) as unknown as {
      programs: ProgramsResponse;
      organisationUnits: OrganisationUnitsResponse;
    };
    return { programs, organisationUnits };
  },
  pendingComponent: () => (
    <Flex justify="center" align="center" style={{ height: "100%" }}>
      <Spin indicator={<LoadingOutlined spin />} />
    </Flex>
  ),
});

function RootComponent() {
  return (
    <Flex
      vertical
      style={{
        height: "calc(100vh - 48px)",
        minHeight: "calc(100vh - 48px)",
        maxHeight: "calc(100vh - 48px)",
        padding: "16px",
      }}
      gap="16px"
    >
      <Outlet />
    </Flex>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => {
    throw indexRoute.redirect({
      to: "/programs",
      search: {
        pageSize: 15,
      },
    });
  },
});

const programsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/programs",
  component: ProgramsComponent,
  validateSearch: z.object({
    program: z.string().optional().nullish(),
    startDate: z.string().optional().nullish(),
    endDate: z.string().optional().nullish(),
    page: z.int().optional().catch(1),
    pageSize: z.int().optional().catch(20),
  }).parse,
  search: {
    middlewares: [retainSearchParams(["program"])],
  },
});

function ProgramsComponent() {
  const { programs } = rootRoute.useLoaderData();
  const { endDate, program, startDate } = programsRoute.useSearch();
  const navigate = programsRoute.useNavigate();
  return (
    <Flex vertical gap={16} style={{ height: "100%", flex: 1 }}>
      <Flex style={{ width: "100%" }} gap="8px">
        <Form.Item label="Program">
          <Select<string, Program>
            options={programs}
            fieldNames={{ label: "name", value: "id" }}
            style={{ width: 500 }}
            onChange={(program) => {
              navigate({
                search: (prev) => ({ ...prev, program }),
              });
            }}
            value={program}
          />
        </Form.Item>
        <Form.Item label="Period">
          <RangePicker
            onChange={(date) => {
              navigate({
                search: (prev) => ({
                  ...prev,
                  startDate: date?.[0]?.format(),
                  endDate: date?.[1]?.format(),
                }),
              });
            }}
            value={
              startDate && endDate
                ? [dayjs(startDate), dayjs(endDate)]
                : undefined
            }
          />
        </Form.Item>
      </Flex>
      <Outlet />
    </Flex>
  );
}

const programsIndexRoute = createRoute({
  getParentRoute: () => programsRoute,
  path: "/",
  component: ProgramsIndexComponent,
});

function ProgramsIndexComponent() {
  const [progress, setProgress] = useState<number>(0);
  const [downloading, setDowmloading] = useState<boolean>(false);
  const navigate = programsIndexRoute.useNavigate();
  const { programs, organisationUnits } = rootRoute.useLoaderData();
  const { endDate, program, startDate, page, pageSize } =
    programsRoute.useSearch();
  const engine = useDataEngine();

  const download = async () => {
    if (!isEmpty(program)) {
      setDowmloading(() => true);
      const currentProgram = programs.find((p) => p.id === program);
      if (currentProgram === undefined) {
        return;
      }
      const programStage = currentProgram.programStages[0];
      if (programStage === undefined) {
        return;
      }
      const elements = fromPairs(
        programStage.programStageDataElements.map(
          ({ dataElement: { id, name } }) => [id, name],
        ),
      );
      const districts = fromPairs(
        organisationUnits.map((ou) => {
          let district = "";
          if (ou.level === 6) {
            district = ou.parent.parent.parent.name;
          } else if (ou.level === 5) {
            district = ou.parent.parent.name;
          } else if (ou.level === 4) {
            district = ou.parent.name;
          } else if (ou.level === 3) {
            district = ou.name;
          }
          return [ou.id, district];
        }),
      );

      let params: { [key: string]: any } = {
        programStage: programStage.id,
        page: 1,
        pageSize: 100,
        totalPages: true,
        order: "createdAt",
        includeAllDataElements: true,
        attributeCc: "UjXPudXlraY",
        attributeCos: "l4UMmqvSBe5",
      };
      if (startDate && endDate) {
        params = {
          ...params,
          occurredAfter: startDate,
          occurredBefore: endDate,
        };
      }
      const data = (await engine.query({
        events: {
          resource: "tracker/events.json",
          params,
        },
      })) as unknown as EventsResponse;
      let allRows = data.events.events.map(
        ({
          dataValues,
          completedBy,
          storedBy,
          updatedBy,
          createdBy,
          notes,
          ...rest
        }) => ({
          district: districts[rest.orgUnit],
          ...fromPairs(
            dataValues.map((dv) => [elements[dv.dataElement], dv.value]),
          ),
          ...rest,
        }),
      );
      setProgress(() => progress + (1 / data.events.pager.pageCount) * 100);

      if (data.events.pager.pageCount > 1) {
        for (let page = 2; page <= data.events.pager.pageCount; page++) {
          const data = (await engine.query({
            events: {
              resource: "tracker/events.json",
              params: { ...params, page },
            },
          })) as unknown as EventsResponse;

          allRows = allRows.concat(
            data.events.events.map(
              ({
                dataValues,
                completedBy,
                storedBy,
                updatedBy,
                createdBy,
                notes,
                ...rest
              }) => ({
                district: districts[rest.orgUnit],
                ...fromPairs(
                  dataValues.map((dv) => [elements[dv.dataElement], dv.value]),
                ),
                ...rest,
              }),
            ),
          );

          setProgress(
            () => progress + (page / data.events.pager.pageCount) * 100,
          );
        }
      }

      let wb = utils.book_new();
      wb.Props = {
        Title: "SheetJS Tutorial",
        Subject: "Test",
        Author: "Red Stapler",
        CreatedDate: new Date(),
      };

      wb.SheetNames.push("Listing");

      let ws = utils.json_to_sheet(allRows);
      wb.Sheets["Listing"] = ws;

      const wbout = write(wb, { bookType: "xlsx", type: "binary" });
      saveAs(
        new Blob([s2ab(wbout)], { type: "application/octet-stream" }),
        "export.xlsx",
      );
      setProgress(0);
      setDowmloading(() => false);
    }
  };
  const { isPending, error, data } = useQuery({
    queryKey: ["repoData", program, startDate, endDate, page, pageSize],
    queryFn: async () => {
      if (isEmpty(program)) {
        throw new Error("Program not specified");
      }
      const currentProgram = programs.find((p) => p.id === program);
      if (currentProgram === undefined) {
        throw new Error("Program not found");
      }
      const programStage = currentProgram.programStages[0];
      if (programStage === undefined) {
        throw new Error("Program stage not found");
      }
      const elements = programStage.programStageDataElements.map(
        ({ dataElement: { id, name } }) => {
          return {
            name: id,
            column: name,
            type: "java.lang.String",
            hidden: false,
            meta: false,
          };
        },
      );
      const districts = fromPairs(
        organisationUnits.map((ou) => {
          let district = "";
          if (ou.level === 6) {
            district = ou.parent.parent.parent.name;
          } else if (ou.level === 5) {
            district = ou.parent.parent.name;
          } else if (ou.level === 4) {
            district = ou.parent.name;
          } else if (ou.level === 3) {
            district = ou.name;
          }
          return [ou.id, district];
        }),
      );
      let params: { [key: string]: any } = {
        programStage: programStage.id,
        page,
        pageSize,
        totalPages: true,
        order: "createdAt",
        includeAllDataElements: true,
        attributeCc: "UjXPudXlraY",
        attributeCos: "l4UMmqvSBe5",
      };
      if (startDate && endDate) {
        params = {
          ...params,
          occurredAfter: startDate,
          occurredBefore: endDate,
        };
      }
      const data = (await engine.query({
        events: {
          resource: "tracker/events.json",
          params,
        },
      })) as unknown as EventsResponse;
      const rows = data.events.events.map(
        ({
          dataValues,
          completedBy,
          storedBy,
          updatedBy,
          createdBy,
          notes,
          ...rest
        }) => ({
          ...rest,
          ...fromPairs(dataValues.map((dv: any) => [dv.dataElement, dv.value])),
          district: districts[rest.orgUnit],
        }),
      );

      const { dataValues, ...otherColumns } = data.events.events[0];

      return {
        rows,
        pager: data.events.pager,
        headers: [
          {
            name: "district",
            column: "District",
            type: "java.lang.String",
            hidden: false,
            meta: false,
          },
          ...Object.keys(otherColumns).map((key) => ({
            name: key,
            column: key,
            type: "java.lang.String",
            hidden: false,
            meta: false,
          })),
          ...elements,
        ],
      };
    },
  });

  if (isPending) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%", flex: 1 }}>
        <Spin indicator={<LoadingOutlined spin />} />
      </Flex>
    );
  }

  if (error) return "An error has occurred: " + error.message;

  const columns: TableColumnsType<(typeof data.rows)[0]> = data.headers.map(
    (a) => {
      return { title: a.column, dataIndex: a.name };
    },
  );

  return (
    <Flex vertical gap={10}>
      <Flex justify="flex-end">
        <Button
          onClick={download}
          loading={downloading}
          icon={<DownloadOutlined />}
          type="primary"
        >
          {downloading ? `Downloading ${progress.toFixed(0)}%` : "Download"}
        </Button>
      </Flex>
      <Table
        columns={columns}
        dataSource={data.rows}
        rowKey="event"
        scroll={{ x: "max-content" }}
        pagination={{
          total: data.pager.total,
          pageSize: data.pager.pageSize,
          current: data.pager.page,
        }}
        onChange={(pagination) => {
          navigate({
            search: (prev) => ({
              ...prev,
              pageSize: pagination.pageSize,
              page: pagination.pageSize !== pageSize ? 1 : pagination.current,
            }),
          });
        }}
      />
    </Flex>
  );
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  programsRoute.addChildren([programsIndexRoute]),
]);

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 5000,
  scrollRestoration: true,
  context: { engine: undefined! },
  history: createHashHistory(),
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const MyApp: FC = () => {
  const engine = useDataEngine();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ engine }} />
    </QueryClientProvider>
  );
};

export default MyApp;
