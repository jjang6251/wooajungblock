import {
    Column,
    Entity,
    ManyToMany,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'token' })
export class Blockchain {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ name: 'user_id', unique: true })
    userId: string;
    
    @Column({ name: 'token'})
    token: number;
}
