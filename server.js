require("dotenv").config({ quiet: true });
const express = require("express");
const pino = require("pino")();
const knexfile = require("./knexfile");
const knex = require("knex")(knexfile);

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
      message: "Database connection failed",
    });
    res
      .status(503)
      .json({ status: "Service Unavailable", database: "disconnected" });
  }
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

const start = async () => {
  try {
    pino.info({ message: "Running migrations..." });

    try {
      await knex.migrate.latest({ silent: true });
    } catch (e) {
      pino.error({ message: "Migrations skipped (DB not ready)" });
    }

    const server = app.listen(PORT, () => {
      pino.info({ message: `Server started on port ${PORT}` });
    });

    const shutdown = (signal) => {
      pino.info({ message: `${signal} received. Shutting down...` });
      server.close(async () => {
        await knex.destroy();
        pino.info({ message: "Process exited." });
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    pino.error({ level: "FATAL", message: err.message });
    process.exit(1);
  }
};

start();
