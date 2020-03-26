import { TimestampEntity } from './TimestampEntity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
} from 'typeorm';
import { User } from './User';
import { FileResource } from './FileResource';
import { Length } from 'class-validator';

@Entity()
export class Post extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // eager option 설정 가능
  @ManyToOne(
    () => User,
    user => user.posts,
    { nullable: false, onDelete: 'CASCADE' },
  )
  user!: User;

  @Length(1, 512)
  @Column()
  title: string;

  @Length(1, 65535)
  @Column()
  content: string;

  @OneToMany(
    () => FileResource,
    fileResource => fileResource.post,
    { lazy: true },
  )
  fileResources: FileResource[] | Promise<FileResource[]>; // promise는 lazy loading을 위함
}