exports.up = function (knex) {
  return knex.schema.createTable("products", (table) => {
    table.increments("id");
    table.string("name").notNullable();
    table.decimal("price");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("products");
};
