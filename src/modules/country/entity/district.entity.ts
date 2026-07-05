import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { State } from './state.entity';
import { Country } from './country.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'country_id', type: 'varchar', length: 36, nullable: false })
  countryId: string;

  @Column({ name: 'state_id', type: 'varchar', length: 36, nullable: false })
  stateId: string;
  
  @ManyToOne(() => Country, country => country.districts)
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @ManyToOne(() => State, state => state.districts)
  @JoinColumn({ name: 'state_id' })
  state: State;

  
  // @OneToMany(() => College, college => college.district)
  // colleges: College[];
}