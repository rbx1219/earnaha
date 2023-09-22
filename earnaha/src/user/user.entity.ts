// user/user.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column('text', { array: true, name: 'auth_methods' })
  authMethods: string[];

  @Column({ default: 0, name: 'login_count' })
  loginCount: number;

  @Column({ nullable: true, name: 'last_session' })
  lastSession: Date;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;
}
