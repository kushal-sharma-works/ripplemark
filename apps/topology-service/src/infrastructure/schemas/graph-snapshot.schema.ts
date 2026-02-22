import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GraphSnapshotDocument = GraphSnapshot & Document;

@Schema({ timestamps: true })
export class GraphSnapshot {
  @Prop({ required: true })
  version!: string;

  @Prop({ type: Object, required: true })
  graphData!: {
    nodes: any[];
    edges: any[];
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  createdBy?: string;
}

export const GraphSnapshotSchema = SchemaFactory.createForClass(GraphSnapshot);
