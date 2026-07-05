/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { CommonService } from '../../common/common.service';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRepository {
    constructor(private readonly dataSource: DataSource, private readonly commonService: CommonService) { }

    async validateAccount(uniqueId: string){
        try {
            const sql = `CALL proc_verify_user_account_code(?)`;
            const params = [uniqueId];
            const [userResponse] = await this.dataSource.query(sql, params);
            if (userResponse !== undefined && userResponse.length > 0 && userResponse[0].resultId === 1){
                return 'success';
            }
            else
                return userResponse[0][0].response;

        } catch (error) {
            throw error;
        }
    }


}
