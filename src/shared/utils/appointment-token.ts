import { Injectable } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';


const SECRET = process.env.APPOINTMENT_JWT_SECRET;
const TTL = process.env.APPOINTMENT_TOKEN_TTL || '10m';

@Injectable()
export class AppointmentToken {

    constructor(private readonly jwtService: JwtService
    ){}

    async generateAppointmentToken(payload: Record<string, any>) {
        const pToekn = this.jwtService.sign(payload);

        // return this.jwtService.sign(payload, SECRET, {
        //     expiresIn: TTL,
        //     issuer: 'appointment-service',
        //     audience: 'public-scheduler'
        // });
        return pToekn.toString();
    }

    // async verifyAppointmentToken(token) {
    //     return jwt.verify(token, SECRET, {
    //         issuer: 'appointment-service',
    //         audience: 'public-scheduler'
    //     });
    // }

}