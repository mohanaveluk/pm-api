import { Injectable } from '@nestjs/common';
const moment = require('moment-timezone');


@Injectable()
export class DateService {
  constructor(
  ) {}

  async getUserTimzone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone;
  }

  async getCurrentDateTime() {
    var timeZone = await this.getUserTimzone();
    return moment.utc().tz(timeZone).format('YYYY-MM-DD H:mm:ss');
  }

}