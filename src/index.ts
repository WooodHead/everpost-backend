import dotenv from 'dotenv';
dotenv.config({
  path: __dirname + '/../.env',
});

if (process.env.NODE_ENV === 'production') {
  require('module-alias/register');
  console.log('Run with production mode');
} else if (process.env.NODE_ENV === 'development') {
  console.log('Run with development mode');
}

import Koa, { Next, Context } from 'koa';
import apiRouter from './api';
import bodyparser from 'koa-bodyparser';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import cors from 'koa2-cors';
import logger from 'koa-logger';

createConnection({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_DBNAME || 'everpost',
  synchronize: true,
  logging: false,
  entities: [__dirname + '/entity/**/*{.ts,.js}'],
})
  .then(async () => {
    console.log('Connect to database... OK');
    const app = new Koa();

    app.use(cors());
    app.use(logger());

    // error handler
    app.use(async (ctx: Context, next: Next) => {
      try {
        await next();
      } catch (e) {
        console.log('----- Error Handler Log -----');
        console.error(e);
        console.log('-----------------------------');

        // default status 500
        ctx.status = e.statusCode || e.status || 500;
        ctx.body = {
          message: e.toString() || e.message || 'Unknown error occured',
        };
      }
    });

    app.use(bodyparser());

    // API router
    app.use(apiRouter.allowedMethods());
    app.use(apiRouter.routes());

    app.listen(process.env.PORT || 4000, () => {
      console.log(`Listening on port ${process.env.PORT || 4000}`);
    });
  })
  .catch(error => console.error(error));
