import {
    Column,
    Entity,
    ManyToMany,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'declaration' })
export class Declaration {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ name: 'user_id'})
    userId: string;

    @Column({name: 'escrow_id'})
    escrowId: string
    
    @Column({ name: 'declaration'})
    declaration: string;
}