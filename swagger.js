const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const swaggerDocument = yaml.load(path.join(__dirname, 'swagger.yaml'));

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerDocument));
};

module.exports = setupSwagger;
