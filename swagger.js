const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const swaggerDocument = yaml.load(path.join(__dirname, 'swagger.yaml'));

const setupSwagger = (app) => {
  app.use('/', swaggerUi.serve);
  app.get('/', swaggerUi.setup(swaggerDocument));
};

module.exports = setupSwagger;
