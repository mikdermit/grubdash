const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: orders });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find(order => order.id === orderId);

  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({ status: 404, message: `Order id not found: ${orderId}` });
}

function bodyHasData(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;

    data[propertyName] && propertyName.length > 0
      ? next()
      : next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function dishesIsValidArray(req, res, next) {
  const { data: { dishes } = {} } = req.body;

  dishes.length > 0 && Array.isArray(dishes)
    ? next()
    : next({ status: 400, message: `Order must include at least one dish` });
}

function quantityIsValidNumber(req, res, next) {
  const { data: { dishes } = {} } = req.body;

  dishes.forEach(dish => {
    if (
      !dish.quantity ||
      dish.quantity <= 0 ||
      !Number.isInteger(dish.quantity)
    ) {
      next({
        status: 400,
        message: `Dish ${dish.id} must have a quantity that is an integar greater than 0`
      });
    }
  });

  next();
}

function statusPropertyIsValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];

  !validStatus.includes(status)
    ? next({
        status: 400,
        message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
      })
    : status === "delivered"
    ? next({ status: 400, message: `A delivered order cannot be changed` })
    : next();
}

function idPropertyIsValid(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;

  !id || id === orderId
    ? next()
    : next({
        status: 400,
        message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`
      });
}

function orderIsPending(req, res, next) {
  const status = res.locals.order.status;

  status === "pending"
    ? next()
    : next({
        status: 400,
        message: `An order cannot be deleted unless it is pending`
      });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;

  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    dishes
  };

  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;

  res.json({ data: order });
}

function destroy(req, res, next) {
  const orderId = res.locals.order.id;
  const index = orders.findIndex(order => order.id === orderId);

  if (index > -1) {
    orders.splice(index, 1);
    res.sendStatus(204);
  }
  next({ status: 404, message: `Order id not found: ${orderId}` });
}

module.exports = {
  list,
  delete: [orderExists, orderIsPending, destroy],
  read: [orderExists, read],
  create: [
    bodyHasData("deliverTo"),
    bodyHasData("mobileNumber"),
    bodyHasData("dishes"),
    dishesIsValidArray,
    quantityIsValidNumber,
    create
  ],
  update: [
    orderExists,
    bodyHasData("deliverTo"),
    bodyHasData("mobileNumber"),
    bodyHasData("dishes"),
    dishesIsValidArray,
    quantityIsValidNumber,
    statusPropertyIsValid,
    idPropertyIsValid,
    update
  ]
};
