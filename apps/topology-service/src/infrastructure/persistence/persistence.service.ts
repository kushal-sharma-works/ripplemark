import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GraphService } from '@graph/graph.service';
import { GraphSnapshot, GraphSnapshotDocument } from '../schemas';

@Injectable()
export class PersistenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PersistenceService.name);
  private isShuttingDown = false;

  constructor(
    @InjectModel(GraphSnapshot.name)
    private graphSnapshotModel: Model<GraphSnapshotDocument>,
    private readonly graphService: GraphService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing persistence service');
    await this.loadLatestSnapshot();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down persistence service');
    this.isShuttingDown = true;
    await this.saveSnapshot('shutdown');
  }

  // Load the latest snapshot from MongoDB
  async loadLatestSnapshot(): Promise<boolean> {
    try {
      const latest = await this.graphSnapshotModel
        .findOne()
        .sort({ createdAt: -1 })
        .exec();

      if (!latest) {
        this.logger.log('No existing snapshot found, starting with empty graph');
        return false;
      }

      this.logger.log(`Loading snapshot version ${latest.version}`);
      this.graphService.importGraph(latest.graphData);
      this.logger.log(
        `Loaded ${latest.graphData.nodes.length} nodes and ${latest.graphData.edges.length} edges`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to load snapshot', error);
      return false;
    }
  }

  // Save current graph state to MongoDB
  async saveSnapshot(version: string = new Date().toISOString()): Promise<void> {
    if (this.isShuttingDown && version !== 'shutdown') {
      return;
    }

    try {
      const graphData = this.graphService.exportGraph();
      const stats = this.graphService.getStatistics();

      const snapshot = new this.graphSnapshotModel({
        version,
        graphData,
        metadata: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          timestamp: new Date(),
        },
      });

      await snapshot.save();
      this.logger.log(
        `Saved snapshot ${version}: ${stats.nodeCount} nodes, ${stats.edgeCount} edges`,
      );
    } catch (error) {
      this.logger.error('Failed to save snapshot', error);
      throw error;
    }
  }

  // Periodic snapshot (every 5 minutes)
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePeriodicSnapshot() {
    if (this.isShuttingDown) {
      return;
    }

    const version = `auto_${new Date().toISOString()}`;
    await this.saveSnapshot(version);
  }

  // Get all snapshots
  async getAllSnapshots(): Promise<GraphSnapshotDocument[]> {
    return this.graphSnapshotModel.find().sort({ createdAt: -1 }).exec();
  }

  // Get a specific snapshot
  async getSnapshot(version: string): Promise<GraphSnapshotDocument | null> {
    return this.graphSnapshotModel.findOne({ version }).exec();
  }

  // Restore from a specific snapshot
  async restoreSnapshot(version: string): Promise<boolean> {
    try {
      const snapshot = await this.getSnapshot(version);
      if (!snapshot) {
        this.logger.warn(`Snapshot ${version} not found`);
        return false;
      }

      this.logger.log(`Restoring snapshot ${version}`);
      this.graphService.importGraph(snapshot.graphData);
      this.logger.log(
        `Restored ${snapshot.graphData.nodes.length} nodes and ${snapshot.graphData.edges.length} edges`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to restore snapshot', error);
      return false;
    }
  }

  // Delete old snapshots (keep last N)
  async cleanupOldSnapshots(keepCount: number = 10): Promise<number> {
    try {
      const snapshots = await this.graphSnapshotModel
        .find()
        .sort({ createdAt: -1 })
        .skip(keepCount)
        .exec();

      const idsToDelete = snapshots.map((s) => s._id);
      const result = await this.graphSnapshotModel.deleteMany({
        _id: { $in: idsToDelete },
      });

      this.logger.log(`Cleaned up ${result.deletedCount} old snapshots`);
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup old snapshots', error);
      return 0;
    }
  }
}
