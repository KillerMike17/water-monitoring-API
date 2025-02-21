import { FilterQuery, Model, UpdateQuery } from 'mongoose';
// import { IGenericRepository } from './IGenericRepo';

import { pagiKeys, PaginationInputs } from '@/common/common.types.dto';
import { FAIL, Resp, Succeed } from '@/common/constants/return.const';
import { ColorEnums, logTrace } from '@/common/logger';
import { pickKeys, removeKeys } from '@/common/util/util';
import { ClientSession } from 'mongodb';
import { RespConst as ErrConst } from '../../../common/constants/respConst';
import { RemovedModel, UpdateResponse } from './mongo.entity';

export class PaginatedResponse<T> {
  count: number;
  data: T[];
}

export abstract class MongoGenericRepository<T> {
  private _repository: Model<T>;
  private _populateOnFind: string[];

  protected constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  /**
   * ========================  This one takes everything as an argument things like
   * @param searchTxt
   * @param fieldsToSearch
   * @param filter
   * @param pagination
   */
  public async searchManyAndPaginate(
    searchTxt: string,
    fieldsToSearch: string[],
    filter: FilterQuery<T>,
    pagination?: PaginationInputs,
  ): Promise<Resp<PaginatedResponse<T>>> {
    try {
      const paginateQuery = pickKeys(filter, [...pagiKeys]);
      // this adds text search capability to the above funcion
      const searchText = new RegExp(searchTxt, 'i'); // Case-insensitive search
      let queryOptions: Record<string, any> = {
        $or: fieldsToSearch.map((field) => ({ [field]: searchText })),
      };
      if (!searchTxt) {
        queryOptions = {};
      }

      Object.keys(filter).forEach((key) => {
        queryOptions[key] = filter[key];
      });

      //--- the above function with out text search

      let items: T[] = [];
      // Always make default pagination = 25 with first page
      const limit = pagination?.limit || 25;
      const page = pagination?.page || 1;
      const sort = pagination?.sort || '_id';
      const sortOrder = pagination?.sortOrder;

      // logTrace('filter', filter);

      items = await this._repository
        .find(queryOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ [sort]: sortOrder })
        .lean();

      const count = await this._repository.countDocuments(filter);
      // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);
      // logTrace(`FINDMANY=====>>Filter`, filter, ColorEnums.BgBlue);

      return Succeed({ count, data: items });
    } catch (e) {
      logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //this one is updated and needs only to provide the filter fields and search fields
  public async searchWithPaginate(
    fieldsToSearch: string[],
    filter: FilterQuery<T>,
  ): Promise<Resp<PaginatedResponse<T>>> {
    try {
      const pagination = pickKeys(filter, [...pagiKeys]);
      const query = removeKeys(filter, [...pagiKeys, 'searchText']);
      const searchTxt = filter.searchText;
      // this adds text search capability to the above function
      const searchText = new RegExp(searchTxt, 'i'); // Case-insensitive search
      let queryOptions: Record<string, any> = {
        $or: fieldsToSearch.map((field) => ({ [field]: searchText })),
      };
      if (!searchTxt) {
        queryOptions = {};
      }

      Object.keys(query).forEach((key) => {
        queryOptions[key] = query[key];
      });
      logTrace('query', queryOptions);

      //--- the above function with out text search

      let items: T[] = [];
      // Always make default pagination = 25 with first page
      const limit = pagination?.limit || 25;
      const page = pagination?.page || 1;
      const sort = pagination?.sort || '_id';
      const sortOrder = pagination?.sortOrder;

      // logTrace('filter', filter);
      items = await this._repository
        .find(queryOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ [sort]: sortOrder })
        .lean();
      // logTrace('the Current filter is', filter);

      const count = await this._repository.countDocuments(queryOptions);
      // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);
      // logTrace(`FINDMANY=====>>Filter`, filter, ColorEnums.BgBlue);

      return Succeed({ count, data: items });
    } catch (e) {
      logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async countDocs(filter: FilterQuery<T>): Promise<Resp<number>> {
    try {
      const cnt = await this._repository.countDocuments(filter);
      return Succeed(cnt);
    } catch (e) {
      logTrace(`${this._repository.modelName}--COUNTING ERROR=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //-----  find One Query
  async findById(id: string): Promise<Resp<T>> {
    try {
      const item: T = await this._repository.findById(id).populate(this._populateOnFind).lean();
      // logTrace(`FINDOne=====>>`, item, ColorEnums.BgBlue);
      if (!item) return FAIL(`${ErrConst.NOT_FOUND} ${id}`, 404);
      return Succeed(item);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindByIdError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  public async find(where: {
    filter: FilterQuery<T>;
    sort?: any;
    projection?: any;
    limit?: number;
  }): Promise<Resp<T[]>> {
    try {
      const query = removeKeys(where.filter, [...pagiKeys, 'searchText']);

      const sort = where.sort || {};
      const projection = where.projection || {};
      const limit = where.limit || 0; // No limit if not provided

      const queryBuilder = this._repository
        .find(query, projection)
        .sort(sort)
        .populate(this._populateOnFind)
        .lean();
      if (limit > 0) {
        queryBuilder.limit(limit);
      }

      const items = (await queryBuilder) as unknown as T[]; // Explicit cast

      if (!items || items.length === 0) {
        return Succeed([]);
      }

      return Succeed(items);
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  public async findOne(where: FilterQuery<T>): Promise<Resp<T>> {
    try {
      const query = removeKeys(where, [...pagiKeys, 'searchText']);
      const user: T = await this._repository.findOne(query).populate(this._populateOnFind).lean();
      if (!user) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(user);
    } catch (e) {
      // logTrace(`${this._repository.modelName}--FindOneError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  public async findOneWithSession(
    where: FilterQuery<T>,
    session: ClientSession,
  ): Promise<Resp<any>> {
    try {
      const query = removeKeys(where, [...pagiKeys, 'searchText']);
      const user = await this._repository
        .findOne(query)
        .populate(this._populateOnFind)
        .lean()
        .session(session);
      if (!user) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(user);
    } catch (e) {
      // logTrace(`${this._repository.modelName}--FindOneError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  //----- find many query
  async getAll(where: FilterQuery<T> = {}): Promise<Resp<T[]>> {
    try {
      const user: T[] = await this._repository.find(where).populate(this._populateOnFind).exec();

      return Succeed(user);
    } catch (e) {
      logTrace(`${this._repository.modelName}--find() error=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Create Query
  async createOne(input: Partial<T>): Promise<Resp<T>> {
    try {
      const created: T = await this._repository.create({ ...input });
      return Succeed(created);
    } catch (e) {
      logTrace(`${this._repository.modelName}--CreateError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 400);
    }
  }

  //Create Query
  async createOneWithTransaction(input: Partial<T>, session: ClientSession): Promise<Resp<T>> {
    try {
      const data = new this._repository(input);
      await data.save({ session });

      return Succeed(data);
    } catch (e) {
      logTrace(`${this._repository.modelName}--CreateError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 400);
    }
  }

  // ====================  UPDATING QUERIES

  //Update queries & returns the updated document
  async updateById(_id: string, input: UpdateQuery<T>): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository.findByIdAndUpdate(_id, input, { new: true }).lean();
      // logTrace('UPDATED ONE >===>> ', updated, ColorEnums.BgCyan);
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--UpdateByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Update queries & returns the updated document
  async updateByIdWithTransaction(
    _id: string,
    input: UpdateQuery<T>,
    session: ClientSession,
  ): Promise<Resp<any>> {
    try {
      const updated = await this._repository
        .findByIdAndUpdate(_id, input, { new: true, session })
        .lean();

      // logTrace('UPDATED ONE >===>> ', updated, ColorEnums.BgCyan);
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--UpdateByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  // UPSERTS and returns teh matched, modified , upserted count
  async upsertOneAndReturnCnt(
    filter: FilterQuery<T>,
    input: UpdateQuery<T>,
  ): Promise<Resp<UpdateResponse>> {
    try {
      const updated: UpdateResponse = await this._repository
        .updateOne(filter, input, { new: true, upsert: true })
        .lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  // Update and returns teh matched, modified , upserted count
  async updateOneAndReturnCount(filter: FilterQuery<T>, input: UpdateQuery<T>) {
    try {
      const updated: UpdateResponse = await this._repository.updateOne(filter, input).lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Update and return the updated document
  async findOneAndUpdate(filter: FilterQuery<T>, input: UpdateQuery<T>): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository.findOneAndUpdate(filter, input).lean();
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Update and return the updated document
  async findOneAndUpsert(filter: FilterQuery<T>, input: UpdateQuery<T>): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository
        .findOneAndUpdate(filter, input, { new: true, upsert: true, returnDocument: 'after' })
        .lean();
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async updateMany(filter: FilterQuery<T>, input: UpdateQuery<T>) {
    try {
      const updated: UpdateResponse = await this._repository
        .updateMany(filter, input, { new: true })
        .lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--UpdateManyError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  // ====================  Delete QUERIES
  public async findByIdAndDelete(_id: string): Promise<Resp<T>> {
    try {
      const deleted: T = await this._repository.findByIdAndDelete(_id).lean();
      if (!deleted) return FAIL(ErrConst.NOT_FOUND, 404);
      // logTrace('Deleted ONE >===>> ', deleted, ColorEnums.BgMagenta);

      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  async deleteOne(filter: FilterQuery<T>): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteOne(filter);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async findOneAndRemove(filter: FilterQuery<T>): Promise<Resp<T>> {
    try {
      const deleted = await this._repository.findOneAndRemove(filter);
      if (!deleted) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async deleteMany(filter: FilterQuery<T>): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteMany(filter);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteManyError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }
}
