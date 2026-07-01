// In-Memory Mock of Mongoose Model for Prototype
import { v4 as uuidv4 } from 'uuid';

const alerts = [];

class Alert {
  constructor(data) {
    this._id = uuidv4();
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.reportedBy = data.reportedBy || [];
    this.confirmations = data.confirmations || 1;
    this.rejections = data.rejections || 0;
    this.isValidated = data.isValidated || false;
    this.createdAt = data.createdAt || new Date();
  }

  static async find(query = {}) {
    return alerts.filter(alert => {
      let match = true;
      for (const key in query) {
        if (alert[key] !== query[key]) match = false;
      }
      return match;
    });
  }

  static async findById(id) {
    return alerts.find(a => a._id === id);
  }

  static async findByIdAndDelete(id) {
    const index = alerts.findIndex(a => a._id === id);
    if (index > -1) {
      alerts.splice(index, 1);
    }
  }

  static async deleteMany() {
    alerts.length = 0;
  }

  async save() {
    const index = alerts.findIndex(a => a._id === this._id);
    if (index > -1) {
      alerts[index] = this;
    } else {
      alerts.push(this);
    }
    return this;
  }
}

export default Alert;
