
import { Injectable } from "@nestjs/common";
const moment = require('moment-timezone');
var url = require('url');

@Injectable()
export class CommonService {
    static formatDateTime(datetime, mode){ //mode: 1 - plain date/time, mode:2 - month, date/time, mode:3 - day, month year /time  
        if(mode === 1){
            //return moment(datetime).format('LT')
            //return moment(datetime).format('MM/DD/YYYY hh:mm A');
            var dateFormat = `${moment(datetime, 'YYYY-MM-DD H:mm:ss').format('dddd')}, ${moment(datetime, 'YYYY-MM-DD H:mm:ss').format('MMMM DD Y')} at ${moment(datetime, 'YYYY-MM-DD H:mm:ss').format('hh:mm A')}`;
            return dateFormat;
        }
        else if(mode === 2){
            return moment(datetime, 'YYYY-MM-DD H:mm:ss').format('LLL');
        }
        else if(mode === 3){
            return moment(datetime, 'YYYY-MM-DD H:mm:ss').format('LLLL');
        }
        else if(mode === 4){
            return moment(datetime, 'YYYY-MM-DD H:mm:ss').format('MMM DD YYYY hh:mm:ss A');
        }
    }

    isNullOrEmpty(value){
        return value === undefined || value === null || value === '';
    }

    static getHost(req) {
        return url.format({
            protocol: req.protocol,
            host: req.get('host')
        });
    }

    static getCurrentDateTime() {
        return moment().format('YYYY-MM-DD H:mm:ss');
    }
    
    // get current UTC date and time
    static getCurrentUTCDateTime() {
        return moment.utc().format('YYYY-MM-DD H:mm:ss');
        //return moment.utc().format('YYYY-MM-DD hh:mm:ss A');
    }
    // Current UTC date:
    //getCurrentUTCDateTime(); // Output: 2020-05-20 12:41:47 PM

    
    // convert local time to UTC time
    static convertLocalToUTC(dt, dtFormat) {
        return moment(dt, dtFormat).utc().format('YYYY-MM-DD H:mm:ss');
        //return moment(dt, dtFormat).utc().format('YYYY-MM-DD hh:mm:ss A');
    }

    // convert utc time to local time
    static convertUTCToLocal(utcDt, utcDtFormat) {
        var toDt = moment.utc(utcDt, utcDtFormat).toDate();
        return moment(toDt).format('YYYY-MM-DD H:mm:ss');
        //return moment(toDt).format('YYYY-MM-DD hh:mm:ss A');
    }
    // UTC date "2020-05-20 04:42:44 PM" to local date:
    // convertUTCToLocal('2020-05-20 04:42:44 PM'); // Output: 2020-05-20 10:12:44 PM

    // convert utc time to another timezone
    static convertUTCToTimezone(utcDt, utcDtFormat, timezone) {
        return moment.utc(utcDt, utcDtFormat).tz(timezone).format('YYYY-MM-DD H:mm:ss');
        //return moment.utc(utcDt, utcDtFormat).tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }
    // UTC date "2020-05-20 04:42:44 PM" to "America/Los_Angeles" timezone date:
    //convertUTCToTimezone('2020-05-20 04:42:44 PM', null, 'America/Los_Angeles'); // Output: 2020-05-20 09:42:44 AM

    // convert utc time to another timezone
    static convertUTCToTimezoneFormat(utcDt, utcDtFormat, timezone) {
        return moment.utc(utcDt, utcDtFormat).tz(timezone).format('MM-DD-YYYY H:mm:ss');
        //return moment.utc(utcDt, utcDtFormat).tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }
    // UTC date "2020-05-20 04:42:44 PM" to "America/Los_Angeles" timezone date:
    //convertUTCToTimezone('2020-05-20 04:42:44 PM', null, 'America/Los_Angeles'); // Output: 2020-05-20 09:42:44 AM

        
    // convert current utc time to another timezone
    static convertCurrentUTCToTimezone(timezone) {
        return moment.utc().tz(timezone).format('YYYY-MM-DD H:mm:ss');
        //return moment.utc().tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }

    static convertCurrentUTCToTimezoneDT(timezone) {
        return moment.utc().tz(timezone);
    }

    static convertUTCToLocalTimezone(utcDt, utcDtFormat) {
        var localTimezone = moment.tz.guess();
        return moment.utc(utcDt, utcDtFormat).tz(localTimezone).format('YYYY-MM-DD H:mm:ss');
        //return moment.utc(utcDt, utcDtFormat).tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }

    //Get pacific timesone
    static convertUTCToPacificTimezone(utcDt, utcDtFormat) {
        var localTimezone = 'America/Los_Angeles';
        return moment.utc(utcDt, utcDtFormat).tz(localTimezone).format('YYYY-MM-DD H:mm:ss');
        //return moment.utc(utcDt, utcDtFormat).tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }


    // convert local time to another timezone
    static convertLocalToTimezone(localDt, localDtFormat, timezone) {
        return moment(localDt, localDtFormat).tz(timezone).format('YYYY-MM-DD H:mm:ss');
        //return moment(localDt, localDtFormat).tz(timezone).format('YYYY-MM-DD hh:mm:ss A');
    }
    // Local date "2020-05-20 10:12:44 PM" to "America/Los_Angeles" timezone date:
    // convertLocalToTimezone('2020-05-20 10:12:44 PM', null, 'America/Los_Angeles'); // Output: 2020-05-20 09:42:44 AM

    static formatDate(strDate) {
        var formattedDate = moment(strDate, 'YYYY-MM-DD HH:mm').format('MM/DD/YYYY');
        return formattedDate;
    }

    static getFormatDateYear(strDate) {
        var formattedDate = strDate.indexOf(moment().format('YYYY')) >= 0 ? moment(strDate, 'MM/DD/YYYY HH:mm').format('MMM DD hh:mm A') : moment(strDate, 'MM/DD/YYYY HH:mm').format('MMM DD YYYY hh:mm A');
        return formattedDate;
    }

    static getCurrentYear(){
        return moment().format('YYYY');
    }

    static getDaysBetweenDates(startDate, endDate){
        var _startDate = moment(startDate, "YYYY-MM-DD");
        var _endDate = moment(endDate, "YYYY-MM-DD");
        var days = moment.duration(_endDate.diff(_startDate)).asDays();
        
        return days;
    }

    static convertToDate(strDate){
        return moment(strDate, 'YYYY-MM-DD');
    }

    static convertDateToString(strDate){
        return moment(strDate, 'YYYY-MM-DD').format('YYYY-MM-DD');
    }

    static addDate(strDate, day){
        return moment(strDate, 'YYYY-MM-DD').add('day', day);
    }

    static addDateWithFormat(strDate, day){
        return moment(strDate, 'YYYY-MM-DD').add(day, 'day').format('YYYY-MM-DD');
    }

    static isPastDate(strDate, timezone){
        var localTime = this.convertCurrentUTCToTimezone(timezone);
        return moment(`${strDate} 18:00`, 'YYYY-MM-DD HH:mm') < moment(localTime, 'YYYY-MM-DD HH:mm'); //(`${moment().format('YYYY-MM-DD')} 18:00`, 'YYYY-MM-DD HH:mm');
    }

    static weekStartAndEndDates(startDate, endDate) {
        var weeks = [];

        var _startDate = moment(startDate, 'YYYY-MM-DD');
        var _endDate = moment(endDate, 'YYYY-MM-DD');
            
        // Set the start date to the beginning of the week
        _startDate.startOf('isoWeek');

        // Set the end date to the end of the week
        _endDate.endOf('isoWeek');

        // Iterate through each week
        while (_startDate.isSameOrBefore(_endDate)) {
            const weekStartDate = _startDate.clone().toDate();
            const weekEndDate = _startDate.clone().endOf('isoWeek').toDate();
        
            weeks.push({ startDate: weekStartDate, endDate: weekEndDate });
        
            // Move to the next week
            _startDate.add(1, 'week').startOf('isoWeek');
          }

          return weeks;
    }

    static ConvertTimeToHour(strDate){
        var hour = moment(strDate, 'HH:mm:ss').format('H');
        return parseInt(hour);
    }

    parseLocalDate(dateStr: string): Date {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
}
