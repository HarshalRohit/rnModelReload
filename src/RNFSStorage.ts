/*
 * THIS FILE IS CLONE OF async_storage_io.ts
 * NOT MANY CHANGES EXCEPT USAGE OF FS LIBRARY
 */

import RNFetchBlob from 'rn-fetch-blob';

import {io} from '@tensorflow/tfjs-core';
import {fromByteArray, toByteArray} from 'base64-js';

type StorageKeys = {
  info: string;
  modelArtifactsWithoutWeights: string;
  weightData: string;
};

const PATH_SEPARATOR = '/';
const PATH_PREFIX = 'tensorflowjs_models';
const INFO_SUFFIX = 'info';
const MODEL_SUFFIX = 'model_without_weight';
const WEIGHT_DATA_SUFFIX = 'weight_data';

function getModelKeys(path: string): StorageKeys {
  return {
    info: [PATH_PREFIX, path, INFO_SUFFIX].join(PATH_SEPARATOR),
    modelArtifactsWithoutWeights: [PATH_PREFIX, path, MODEL_SUFFIX].join(
      PATH_SEPARATOR,
    ),
    weightData: [PATH_PREFIX, path, WEIGHT_DATA_SUFFIX].join(PATH_SEPARATOR),
  };
}

/**
 * Populate ModelArtifactsInfo fields for a model with JSON topology.
 * @param modelArtifacts
 * @returns A ModelArtifactsInfo object.
 */
function getModelArtifactsInfoForJSON(
  modelArtifacts: io.ModelArtifacts,
): io.ModelArtifactsInfo {
  if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
    throw new Error('Expected JSON model topology, received ArrayBuffer.');
  }

  return {
    dateSaved: new Date(),
    // TODO followup on removing this from the the interface
    modelTopologyType: 'JSON',
    weightDataBytes:
      modelArtifacts.weightData == null
        ? 0
        : modelArtifacts.weightData.byteLength,
  };
}

const checkAndCreateModelDir = async (filePath: string) => {
  try {
    const pathIsDir = RNFetchBlob.fs.isDir(filePath);

    if (!pathIsDir) {
      RNFetchBlob.fs.mkdir(filePath);
    }
  } catch (error) {
    console.error(`Create Model Dir ${error}`);
  }
};

class DiskStorageHandler implements io.IOHandler {
  protected readonly keys: StorageKeys;
  protected rootDir = `${RNFetchBlob.fs.dirs.DocumentDir}`;
  protected modelPath: string;

  constructor(protected readonly modelName: string) {
    if (modelName == null || !modelName) {
      throw new Error('modelPath must not be null, undefined or empty.');
    }
    this.keys = getModelKeys(this.modelName);
    this.modelPath = [PATH_PREFIX, this.modelName].join(PATH_SEPARATOR);
  }

  /**
   * Save model artifacts to AsyncStorage
   *
   * @param modelArtifacts The model artifacts to be stored.
   * @returns An instance of SaveResult.
   */
  async save(modelArtifacts: io.ModelArtifacts): Promise<io.SaveResult> {
    if (modelArtifacts.modelTopology instanceof ArrayBuffer) {
      throw new Error(
        'RnfsStorageHandler.save() does not support saving model topology ' +
          'in binary format.',
      );
    }

    // We save three items separately for each model,
    // a ModelArtifactsInfo, a ModelArtifacts without weights
    // and the model weights.
    const modelArtifactsInfo: io.ModelArtifactsInfo = getModelArtifactsInfoForJSON(
      modelArtifacts,
    );
    const {weightData, ...modelArtifactsWithoutWeights} = modelArtifacts;

    try {
      const modelDirPath = [this.rootDir, PATH_PREFIX, this.modelName].join(
        PATH_SEPARATOR,
      );
      await checkAndCreateModelDir(modelDirPath);

      await RNFetchBlob.fs.writeFile(
        [this.rootDir, this.keys.info].join(PATH_SEPARATOR),
        JSON.stringify(modelArtifactsInfo),
      );

      await RNFetchBlob.fs.writeFile(
        [this.rootDir, this.keys.modelArtifactsWithoutWeights].join(
          PATH_SEPARATOR,
        ),
        JSON.stringify(modelArtifactsWithoutWeights),
      );

      if (weightData) {
        await RNFetchBlob.fs.writeFile(
          [this.rootDir, this.keys.weightData].join(PATH_SEPARATOR),
          fromByteArray(new Uint8Array(weightData)),
        );
      }

      return {modelArtifactsInfo};
    } catch (err) {
      await RNFetchBlob.fs.unlink(this.modelPath);

      throw new Error(
        `Failed to save model '${this.modelName}' to storage.
            Error info ${err}`,
      );
    }
  }

  /**
   * Load a model from local storage.
   *
   * See the documentation to `browserLocalStorage` for details on the saved
   * artifacts.
   *
   * @returns The loaded model (if loading succeeds).
   */
  async load(): Promise<io.ModelArtifacts> {
    const info = JSON.parse(
      await RNFetchBlob.fs.readFile(
        [this.rootDir, this.keys.info].join(PATH_SEPARATOR),
        'utf8',
      ),
    ) as io.ModelArtifactsInfo;
    if (info == null) {
      throw new Error(
        `In Disk storage, there is no model with name '${this.modelName}'`,
      );
    }

    if (info.modelTopologyType !== 'JSON') {
      throw new Error(
        'Disk storage does not support loading non-JSON model ' +
          'topology yet.',
      );
    }

    const modelArtifacts: io.ModelArtifacts = JSON.parse(
      await RNFetchBlob.fs.readFile(
        [this.rootDir, this.keys.modelArtifactsWithoutWeights].join(
          PATH_SEPARATOR,
        ),
        'utf8',
      ),
    );

    // Load weight data.
    const weightDataBase64 = await RNFetchBlob.fs.readFile(
      [this.rootDir, this.keys.weightData].join(PATH_SEPARATOR),
      'utf8',
    );
    if (weightDataBase64 == null) {
      throw new Error(
        'In disk storage, the binary weight values of model ' +
          `'${this.modelName}' are missing.`,
      );
    }
    modelArtifacts.weightData = toByteArray(weightDataBase64).buffer;

    return modelArtifacts;
  }
}

/**
 * Factory function for RNFS/RNFetchBlob IOHandler.
 *
 * This `IOHandler` supports both `save` and `load`.
 *
 * For each model's saved artifacts, three items are saved to async storage.
 *   - `tensorflowjs_models/${modelPath}/info`: Contains meta-info about the
 *     model, such as date saved, type of the topology, size in bytes, etc.
 *   - `tensorflowjs_models/${modelPath}/model_without_weight`: The topology,
 *     weights_specs and all other information about the model except for the
 *     weights.
 *   - `tensorflowjs_models/${modelPath}/weight_data`: Concatenated binary
 *     weight values, stored as a base64-encoded string.
 *
 * ```js
 *  async function asyncStorageExample() {
 *    // Define a model
 *    const model = tf.sequential();
 *    model.add(tf.layers.dense({units: 5, inputShape: [1]}));
 *    model.add(tf.layers.dense({units: 1}));
 *    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
 *
 *    // Save the model to async storage
 *    await model.save(DiskStorageIO('custom-model-test'));
 *    // Load the model from async storage
 *    await tf.loadLayersModel(DiskStorageIO('custom-model-test'));
 * }
 * ```
 *
 * @param modelPath A unique identifier for the model to be saved. Must be a
 *   non-empty string.
 * @returns An instance of `IOHandler`
 *
 * @doc {heading: 'Models', subheading: 'IOHandlers'}
 */
export function DiskStorageIO(modelPath: string): io.IOHandler {
  return new DiskStorageHandler(modelPath);
}
