const { Kafka } = require("kafkajs");
const constants = require("@config/constants");
const log4js = require("log4js");
const logger = log4js.getLogger(
  `${constants.ENVIRONMENT} -- bin/kafka-consumer`
);
const EventModel = require("@models/Event");
const ReadingModel = require("@models/Reading");
const { logText, logObject, logElement } = require("@utils/log");
const createEvent = require("@utils/create-event");
const Joi = require("joi");
const { jsonrepair } = require("jsonrepair");
const cleanDeep = require("clean-deep");
const isEmpty = require("is-empty");
const { HttpError } = require("@utils/errors");
const jsonify = require("@utils/jsonify");
const asyncRetry = require("async-retry");
const generateFilter = require("@utils/generate-filter");

const eventSchema = Joi.object({
  s2_pm2_5: Joi.number().optional(),
  s2_pm10: Joi.number().optional(),
  longitude: Joi.number()
    .precision(5)
    .optional(),
  satellites: Joi.number().optional(),
  hdop: Joi.number().optional(),
  altitude: Joi.number().optional(),
  s1_pm2_5: Joi.number().optional(),
  battery: Joi.number().optional(),
  device_humidity: Joi.number().optional(),
  s1_pm10: Joi.number().optional(),
  device_temperature: Joi.number().optional(),
  latitude: Joi.number()
    .precision(5)
    .optional(),
  pm2_5_raw_value: Joi.number().optional(),
  pm2_5: Joi.number().optional(),
  pm10_raw_value: Joi.number().optional(),
  pm10: Joi.number().optional(),
  timestamp: Joi.date()
    .iso()
    .required(),
  device_id: Joi.string()
    .empty("")
    .required(),
  site_id: Joi.string().required(),
  device_number: Joi.number().optional(),
  atmospheric_pressure: Joi.number().optional(),
  humidity: Joi.number().optional(),
  temperature: Joi.number().optional(),
  wind_direction: Joi.number().optional(),
  wind_gusts: Joi.number().optional(),
  radiation: Joi.number().optional(),
  wind_speed: Joi.number().optional(),
  vapor_pressure: Joi.number().optional(),
  precipitation: Joi.number().optional(),
  station_code: Joi.string()
    .empty("")
    .optional(),
  pm2_5_calibrated_value: Joi.number().optional(),
  pm10_calibrated_value: Joi.number().optional(),
}).unknown(true);

const eventsSchema = Joi.array().items(eventSchema);

const consumeHourlyMeasurements = async (messageData) => {
  try {
    if (isEmpty(messageData)) {
      logger.error(
        `KAFKA: the sent message in undefined --- ${jsonify(messageData)}`
      );
    }
    const repairedJSONString = jsonrepair(messageData);
    logObject("original string", messageData);
    logObject("repaired string", repairedJSONString);
    const measurements = JSON.parse(repairedJSONString).data;
    // const measurements = JSON.parse(repairedJSONString);
    if (!Array.isArray(measurements) || isEmpty(measurements)) {
      // logger.error(
      //   `KAFKA: the sent measurements are not an array or they are just empty (undefined) --- ${jsonify(
      //     measurements
      //   )}`
      // );
    } else {
      const cleanedMeasurements = measurements.map((obj) =>
        cleanDeep(obj, { cleanValues: ["NaN"] })
      );
      const options = {
        abortEarly: false,
      };
      const { error, value } = eventsSchema.validate(
        cleanedMeasurements,
        options
      );

      if (error) {
        logObject("error.details[0].message", error.details[0].message);
        logObject("error.details[0]", error.details[0]);
        logObject("error.details", error.details);
        const errorDetails = error.details.map((detail) => {
          const event = detail.context.value;
          logObject("KAFKA: the event causing the error", event);
          const {
            device_number,
            device_id,
            timestamp,
            site_id,
            battery,
            network,
            device_latitude,
            device_longitude,
            site_latitude,
            site_longitude,
          } = value[detail.path[0]];
          // return {
          //   message: detail.message,
          //   key: detail.context.key,
          //   value: detail.context.value,
          //   device_number: device_number ? device_number : undefined,
          //   timestamp: timestamp ? timestamp : undefined,
          // };
        });
        // logger.error(
        //   `KAFKA: Input validation formatted errors -- ${jsonify(
        //     errorDetails
        //   )}`
        // );

        // logger.error(
        //     `KAFKA: ALL the input validation errors --- ${jsonify(error.details)}`
        // );

        // logger.info(
        //     `KAFKA: the VALUE for ALL the shared input validation errors --- ${jsonify(value)}`
        // );
      }
      logObject("value", value);
      logObject("cleanedMeasurements", cleanedMeasurements);
      const request = {
        body: cleanedMeasurements,
      };
      const responseFromInsertMeasurements = await createEvent.create(request);

      logObject(
        "responseFromInsertMeasurements",
        responseFromInsertMeasurements
      );

      if (responseFromInsertMeasurements.success === false) {
        // logger.error(
        //   `KAFKA: responseFromInsertMeasurements --- ${jsonify(
        //     responseFromInsertMeasurements
        //   )}`
        // );
      } else if (responseFromInsertMeasurements.success === true) {
        // logger.info(
        //     `KAFKA: successfully inserted the measurements --- ${jsonify(responseFromInsertMeasurements.message ?
        //     responseFromInsertMeasurements.message :
        //     "")}`
        // );
      }
    }
  } catch (error) {
    logObject("KAFKA error for consumeHourlyMeasurements()", error);
    logger.info(
      `ℹ️ℹ️ incoming KAFKA value which is causing errors --- ${message.value.toString()}`
    );
    logger.info(
      `ℹ️ℹ️ incoming KAFKA value's TYPE which is causing errors --- ${typeof message.value}`
    );
    logger.error(`🐛🐛 KAFKA: error message --- ${error.message}`);
    logger.error(`🐛🐛 KAFKA: full error object --- ${jsonify(error)}`);
  }
};

const fetchAndStoreDataIntoReadingsModel = async () => {
  try {
    const request = {
      query: {
        tenant: "airqo",
        recent: "yes",
        metadata: "site_id",
        active: "yes",
        brief: "yes",
      },
    };
    const filter = generateFilter.fetch(request);
    // Fetch the data
    const viewEventsResponse = await EventModel("airqo").fetch(filter);
    logText("we are running running the data insertion script");

    if (viewEventsResponse.success === true) {
      const data = viewEventsResponse.data[0].data;
      if (!data) {
        logText(`🐛🐛 Didn't find any Events to insert into Readings`);
        logger.error(`🐛🐛 Didn't find any Events to insert into Readings`);
        return {
          success: true,
          message: `🐛🐛 Didn't find any Events to insert into Readings`,
          status: httpStatus.OK,
        };
      }
      // Prepare the data for batch insertion
      const batchSize = 50; // Adjust this value based on your requirements
      const batches = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }

      // Insert each batch in the 'readings' collection with retry logic
      for (const batch of batches) {
        for (const doc of batch) {
          await asyncRetry(
            async (bail) => {
              try {
                // logObject("document", doc);
                const res = await ReadingModel("airqo").updateOne(doc, doc, {
                  upsert: true,
                });
                logObject("res", res);
                // logObject("Number of documents updated", res.modifiedCount);
              } catch (error) {
                if (error.name === "MongoError" && error.code !== 11000) {
                  logger.error(
                    `🐛🐛 MongoError -- fetchAndStoreDataIntoReadingsModel -- ${jsonify(
                      error
                    )}`
                  );
                  throw error; // Retry the operation
                } else if (error.code === 11000) {
                  // Ignore duplicate key errors
                  console.warn(
                    `Duplicate key error for document: ${jsonify(doc)}`
                  );
                }
              }
            },
            {
              retries: 5, // Number of retry attempts
              minTimeout: 1000, // Initial delay between retries (in milliseconds)
              factor: 2, // Exponential factor for increasing delay between retries
            }
          );
        }
      }
      logText(`All data inserted successfully`);
      return;
    } else {
      logObject(
        `🐛🐛 Unable to retrieve Events to insert into Readings`,
        viewEventsResponse
      );

      logger.error(
        `🐛🐛 Unable to retrieve Events to insert into Readings -- ${jsonify(
          viewEventsResponse
        )}`
      );
      logText(`🐛🐛 Unable to retrieve Events to insert into Readings`);
      return;
    }
  } catch (error) {
    logObject("error", error);
    logger.error(`🐛🐛 Internal Server Error ${error.message}`);
    return;
  }
};

const kafkaConsumer = async () => {
  try {
    const kafka = new Kafka({
      clientId: constants.KAFKA_CLIENT_ID,
      brokers: constants.KAFKA_BOOTSTRAP_SERVERS,
    });

    const consumer = kafka.consumer({
      groupId: constants.UNIQUE_CONSUMER_GROUP,
      enableAutoCommit: true,
      autoOffsetReset: "latest",
    });

    // Define topic-to-operation function mapping
    const topicOperations = {
      ["hourly-measurements-topic"]: consumeHourlyMeasurements,
      // ["new-hourly-measurements-topic"]: consumeHourlyMeasurements,
      //topic2: operationFunction2,
      // Add more topics and their corresponding functions as needed
    };
    await consumer.connect();
    // Subscribe to all topics in the mapping
    await Promise.all(
      Object.keys(topicOperations).map((topic) => {
        consumer.subscribe({ topic, fromBeginning: false });
        consumer.run({
          eachMessage: async ({ message }) => {
            try {
              const operation = topicOperations[topic];
              if (operation) {
                // const messageData = JSON.parse(message.value.toString());
                const messageData = message.value.toString();
                await operation(messageData);
                // try {
                //   await fetchAndStoreDataIntoReadingsModel();
                // } catch (error) {
                //   logger.error(
                //     `🐛🐛 Internal Server Error when running fetchAndStoreDataIntoReadingsModel(): ${jsonify(
                //       error
                //     )}`
                //   );
                // }
              } else {
                logger.error(`🐛🐛 No operation defined for topic: ${topic}`);
              }
            } catch (error) {
              logger.error(
                `🐛🐛 Error processing Kafka message for topic ${topic}: ${jsonify(
                  error
                )}`
              );
            }
          },
        });
      })
    );
  } catch (error) {
    logObject("Error connecting to Kafka", error);
    logger.error(`📶📶 Error connecting to Kafka: ${jsonify(error)}`);
  }
};

module.exports = kafkaConsumer;
