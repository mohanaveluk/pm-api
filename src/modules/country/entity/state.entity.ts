import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Country } from './country.entity';

import { District } from './district.entity';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;
  
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'country_id', type: 'varchar', length: 36, nullable: false })
  countryId: string;
  
  @ManyToOne(() => Country, country => country.states)
  @JoinColumn({ name: 'country_id' })
  country?: Country;

  @OneToMany(() => District, district => district.state)
  districts?: District[];



  // @OneToMany(() => College, college => college.state)
  // colleges?: College[];
}