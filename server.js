require("dotenv").config({ silent: true });
const express = require("express");
const config = require("./knexfile");
const knex = require("knex")(config);
const pino = require("pino")();

const app = express();
const PORT = process.env.PORT || 8080;

app.use((req, res, next) => {
  pino.info({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: `REQ: ${req.method} ${req.url}`,
  });
  next();
});

app.get("/health", async (req, res) => {
  try {
    await knex.raw("SELECT 1");
    res.status(200).json({ status: "OK", database: "connected" });
  } catch (err) {
    pino.error({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: "DB connection failed",
    });
    res
      .status(503)
      .json({ status: "Service Unavailable", database: "disconnected" });
  }
});

const start = async () => {
  try {
    pino.info({ message: "Running migrations..." });
    await knex.migrate.latest();

    const server = app.listen(PORT, () => {
      pino.info({ message: `Server started on port ${PORT}` });
    });

    const shutdown = (signal) => {
      pino.info({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: `${signal} received. Starting graceful shutdown...`,
      });

      server.close(async () => {
        pino.info({ message: "HTTP server closed." });
        await knex.destroy();
        pino.info({ message: "Database connections closed. Process exited." });
        process.exit(0);
      });

      setTimeout(() => {
        pino.error({
          message:
            "Could not close connections in time, forcefully shutting down",
        });
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    pino.error({ level: "FATAL", message: err.message });
    process.exit(1);
  }
};

start();
