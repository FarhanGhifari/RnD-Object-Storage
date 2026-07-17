'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class File extends Model {}
  File.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    storagePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'File',
    tableName: 'files',
    underscored: true,
  });
  return File;
};
