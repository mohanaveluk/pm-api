import { Entity, PrimaryColumn, Column, CreateDateColumn, JoinColumn, ManyToOne, OneToMany, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { State } from './state.entity';
import { District } from './district.entity';

@Entity({ name: 'country' })
export class Country {

    @PrimaryColumn()
    id: string;
    @BeforeInsert()
    generateId() {
        this.id = uuidv4();
    }

    @Column({ type: 'varchar', length: 120 })
    name: string;

    @Column({ name: 'iso_code', type: 'varchar', length: 5, nullable: true })
    isoCode: string;

    @Column({ name: 'created_at', type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;    


    @OneToMany(() => State, state => state.country)
    states: State[];    

    @OneToMany(() => District, district => district.country)
    districts: District[];    

 
}