'use strict';

const { File } = require('../models');

class FileRepository {
  async create(data) {
    return File.create(data);
  }

  async findAll() {
    return File.findAll({ 
      order: [['createdAt', 'DESC']] 
    });
  }

  async findById(id) {
    return File.findByPk(id);
  }

  async update(id, data) {
    const [affected] = await File.update(data, { where: { id } });
    if (affected === 0) return null;
    return this.findById(id);
  }

  async delete(id) {
    const deleted = await File.destroy({ where: { id } });
    return deleted > 0;
  }
}

module.exports = new FileRepository();
