FROM node:20.15.0
WORKDIR /myindiaa-assignment
COPY . .
RUN npm ci
EXPOSE 5000
ENV NODE_ENV=production
CMD [ "node", "app.js" ]