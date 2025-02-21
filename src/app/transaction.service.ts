import { Injectable, Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

@Injectable()
export class TransactionService {
  constructor(@InjectConnection() private readonly connection: mongoose.Connection) {}

  async runTransaction(callback: (session: mongoose.ClientSession) => Promise<any>) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error; // Rethrow the error to handle it in the calling code
    } finally {
      await session.endSession();
    }
  }
}

@Module({
  imports: [MongooseModule.forFeature([])], // Import MongooseModule if you're using it
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}

// https://www.phind.com/search?cache=kaijew8aae3ceylnmfalwbd0&source=sidebar
