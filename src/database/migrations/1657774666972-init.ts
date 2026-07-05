import { MigrationInterface, QueryRunner, Table  } from 'typeorm';

export class init1657774666972 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: "int",
            isPrimary: true,
            isUnique: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'guid',
            type: "varchar",
            length: '100',
            isNullable: false,
            isUnique: true,
            generationStrategy: 'uuid'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'int',
            isNullable: false,
            default: 1,
          }          
        ],
      }),
      true,
    );

    //applications
    await queryRunner.query(`
          INSERT INTO roles (name, guid) VALUES 
          ('Approver',         'b7488c81-1a2b-41b1-9f04-b101dc989075')
          ,('Manager',          '31501ab9-d508-4aea-8046-f92327efe1b3')
          ,('SuperAdmin',       '70ebd45b-b0b1-41cf-8e19-53caf36be1c3')
          ,('OrganizationAdmin','ed12a0c4-0c16-4737-99d0-f15f6446f45d')
          ,('User',             '921db096-14a2-424d-bb7c-afd9eaee3022')
          ,('Vendor',           'd2a54247-3215-4e7c-8eda-754c314b2f33')
          ,('Viewer',           '631dfd33-e742-4c01-b6c4-a52c3846d47d')
          ;
          `);
    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

  }
}
