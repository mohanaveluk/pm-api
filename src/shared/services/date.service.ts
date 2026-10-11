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

  async getCurrentDateTimeInUTC() {
    return moment.utc().format('YYYY-MM-DD H:mm:ss');
  }

  //add 15 min from the UTC time and return the new date in UTC format
  async addMinutesToCurrentDateTimeInUTC(minutes: number) {
    return moment.utc().add(minutes, 'minutes').format('YYYY-MM-DD H:mm:ss');
  }
    
}