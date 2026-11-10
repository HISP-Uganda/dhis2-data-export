/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: "data-export",
    title: "DHIS2 Events Data Extraction",
    description: "A simplified Program for generating line lists",
    entryPoints: {
        app: './src/App.tsx',
    },
}

module.exports = config
