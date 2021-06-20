const { Schema } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;
const uniqueValidator = require("mongoose-unique-validator");
const { logElement, logObject, logText } = require("../utils/log");
const jsonify = require("../utils/jsonify");
const isEmpty = require("is-empty");

const siteSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "name is required!"],
    },
    generated_name: {
      type: String,
      trim: true,
      unique: true,
      required: [true, "generated name is required!"],
    },
    formatted_name: {
      type: String,
      trim: true,
      unique: true,
    },
    lat_long: {
      type: String,
      trim: true,
      unique: true,
      required: [true, "lat_long is required is required!"],
    },
    description: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, "latitude is required!"],
    },
    longitude: {
      type: Number,
      required: [true, "longitude is required!"],
    },
    site_tags: { type: Array, default: [] },
    altitude: {
      type: Number,
    },
    distance_to_nearest_road: {
      type: Number,
      trim: true,
    },
    google_place_id: {
      type: String,
    },
    distance_to_nearest_motorway: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_city: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_residential_area: {
      type: Number,
      trim: true,
    },
    distance_to_kampala_center: {
      type: Number,
      trim: true,
    },
    bearing_to_kampala_center: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_primary_road: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_secondary_road: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_tertiary_road: {
      type: Number,
      trim: true,
    },
    distance_to_nearest_unclassified_road: {
      type: Number,
      trim: true,
    },
    terrain: {
      type: String,
      trim: true,
    },
    land_use: {
      type: String,
      trim: true,
    },
    road_intensity: {
      type: Number,
    },
    road_status: {
      type: String,
    },
    aspect: {
      type: String,
    },
    landform_90: {
      type: Number,
    },
    landform_270: {
      type: Number,
    },
    greenness: {
      type: Number,
    },
    traffic_factor: {
      type: Number,
    },
    parish: {
      type: String,
      trim: true,
    },
    village: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    town: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    geometry: {
      type: Object,
      trim: true,
    },
    county: {
      type: String,
      trim: true,
    },
    sub_county: {
      type: String,
      trim: true,
    },
    count: { type: Number },
    country: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

siteSchema.pre("save", function(next) {
  if (this.isModified("latitude")) {
    delete this.latitude;
  }
  if (this.isModified("longitude")) {
    delete this.longitude;
  }
  if (this.isModified("_id")) {
    delete this._id;
  }
  return next();
});

siteSchema.pre("update", function(next) {
  if (this.isModified("latitude")) {
    delete this.latitude;
  }
  if (this.isModified("longitude")) {
    delete this.longitude;
  }
  if (this.isModified("_id")) {
    delete this._id;
  }
  return next();
});

siteSchema.index({ lat_long: 1 }, { unique: true });
siteSchema.index({ generated_name: 1 }, { unique: true });

siteSchema.plugin(uniqueValidator, {
  message: `{VALUE} already taken!`,
});

siteSchema.methods = {
  toJSON() {
    return {
      _id: this._id,
      name: this.name,
      generated_name: this.generated_name,
      formatted_name: this.formatted_name,
      lat_long: this.lat_long,
      latitude: this.latitude,
      longitude: this.longitude,
      createdAt: this.createdAt,
      description: this.description,
      site_tags: this.site_tags,
    };
  },
  createSite(args) {
    return this.create({
      ...args,
    });
  },
};

siteSchema.statics = {
  async register(args) {
    try {
      let modifiedArgs = args;
      let site_tags = modifiedArgs.site_tags;
      if (site_tags) {
        modifiedArgs.$addToSet = { site_tags: { $each: site_tags } };
      }
      let data = await this.create({
        ...modifiedArgs,
      });
      if (!isEmpty(data)) {
        return {
          success: true,
          data,
          message: "site created",
        };
      } else {
        return {
          success: false,
          message: "site not create despite successful operation",
        };
      }
    } catch (error) {
      return {
        error: error.message,
        message: "Site model server error - register",
        success: false,
      };
    }
  },
  async list({ skip = 0, limit = 5, filter = {} } = {}) {
    try {
      let sites = await this.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      let data = jsonify(sites);
      if (!isEmpty(data)) {
        return {
          success: true,
          data,
          message: "successfully listed the site(s)",
        };
      }

      if (isEmpty(data)) {
        return {
          success: true,
          message: "no sites exist",
          data,
        };
      }
      return {
        success: false,
        message: "unable to retrieve sites",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Site model server error - list",
        error: error.message,
      };
    }
  },
  async modify({ filter = {}, update = {} } = {}) {
    try {
      let options = { new: true };
      let modifiedUpdateBody = update;
      if (modifiedUpdateBody.site_tags) {
        delete modifiedUpdateBody.site_tags;
      }
      let add_site_tags = modifiedUpdateBody.add_site_tags;
      let remove_site_tags = modifiedUpdateBody.remove_site_tags;

      if (modifiedUpdateBody._id) {
        delete modifiedUpdateBody._id;
      }

      if (add_site_tags) {
        modifiedUpdateBody.$addToSet = { site_tags: { $each: add_site_tags } };
      }

      if (remove_site_tags) {
        modifiedUpdateBody.$pullAll = { site_tags: remove_site_tags };
      }

      if (modifiedUpdateBody.latitude) {
        delete modifiedUpdateBody.latitude;
      }
      if (modifiedUpdateBody.longitude) {
        delete modifiedUpdateBody.longitude;
      }
      let udpatedUser = await this.findOneAndUpdate(
        filter,
        modifiedUpdateBody,
        options
      ).exec();
      let data = jsonify(udpatedUser);
      if (!isEmpty(data)) {
        return {
          success: true,
          message: "successfully modified the site",
          data,
        };
      } else {
        return {
          success: false,
          message: "site does not exist, please crosscheck",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Site model server error - modify",
        error: error.message,
      };
    }
  },
  async remove({ filter = {} } = {}) {
    try {
      let options = {
        projection: {
          _id: 1,
          name: 1,
          generated_name: 1,
          lat_long: 1,
          country: 1,
        },
      };
      let removedUser = await this.findOneAndRemove(filter, options).exec();
      let data = jsonify(removedUser);
      if (!isEmpty(data)) {
        return {
          success: true,
          message: "successfully removed the site",
          data,
        };
      } else {
        return {
          success: false,
          message: "site does not exist, please crosscheck",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Site model server error - remove",
        error: error.message,
      };
    }
  },
};

siteSchema.methods = {};

module.exports = siteSchema;
