import * as tf from '@tensorflow/tfjs';

const ip = '192.168.1.106';
const defaultModelName = 'default-model';

import {DiskStorageIO} from './RNFSStorage';

const loadFromNetwork = async (modelUrl: string, isLayersModel = true) => {
  if (isLayersModel) {
    const model = await tf.loadLayersModel(modelUrl);
    return model;
  }
  const model = await tf.loadGraphModel(modelUrl);
  return model;
};

const loadFromDisk = async (
  modelName = defaultModelName,
  isLayersModel = true,
) => {
  if (isLayersModel) {
    const model = await tf.loadLayersModel(DiskStorageIO(modelName));
    return model;
  }
  const model = await tf.loadGraphModel(DiskStorageIO(modelName));
  return model;
};

const saveModelToDisk = async (
  model: tf.LayersModel | tf.GraphModel,
  modelName = defaultModelName,
) => {
  const res = await model.save(DiskStorageIO(modelName));
  return res;
};

/*
const removeModelFromDisk = () => {}
const listModelsInDisk = () => {}

// Not sure about this
const warmUpModel = () => {}
 */

export {loadFromDisk, loadFromNetwork, saveModelToDisk};

/***********************************************************************
      TO REMOVE IN FINAL COMMIT
***********************************************************************/

/* 
import {bundleResourceIO} from '@tensorflow/tfjs-react-native';
import {asyncStorageIO} from '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-community/async-storage';

const modelDirName = 'walmart_hindi-complete';
const modelJson = require(`../assets/${modelDirName}/model.json`);
const modelWeights = require(`../assets/${modelDirName}/group1-shard1of1.bin`);

const keyInAsyncStorage = 'walmart_hindi';
const modelItemsToCheck = ['info', 'model_without_weight', 'weight_data'];
const repetitiveStr = `tensorflowjs_models/${keyInAsyncStorage}`;

const errModelNotAvailable = 'Model not available on disk.';
const errModelFetchFailed = 'Model ';

const checkModelFilesExists = async () => {
  const allKeys = await AsyncStorage.getAllKeys();

  const tfjsModelKeys = allKeys.filter((val) => val.match(repetitiveStr));

  if (tfjsModelKeys.length !== 3) {
    return false;
  }

  const repetitiveStrLen = repetitiveStr.length + 1;
  const someVarName = tfjsModelKeys.map((val) => val.substr(repetitiveStrLen));

  const compareRes = someVarName.map((val) => modelItemsToCheck.includes(val));

  return compareRes[0] && compareRes[1] && compareRes[2];
};

const loadModelFromDisk = async () => {
  const allFilesPresent = await checkModelFilesExists();

  if (!allFilesPresent) {
    throw new Error(errModelNotAvailable);
  }

  const model = await tf.loadLayersModel(asyncStorageIO(keyInAsyncStorage));
  return model;
};

const loadModel = async () => {
  // const res = await AsyncStorage.getItem(
  //   'tensorflowjs_models/model-save-1/info',
  // );
  // console.log(res);
  let model: tf.LayersModel | undefined;

  // try {
  //   model = await loadModelFromDisk();
  // } catch (error) {
  //   console.log(error);
  // }

  if (!model) {
    // TODO: check if api is up or not

    model = await tf.loadLayersModel(modelUrl);

    // save to disk for subsequent app launches
    const saveRes = await model.save(asyncStorageIO(keyInAsyncStorage));
    console.log(saveRes);
    

    // try {

    //   model = await tf.loadLayersModel(modelUrl);

    //   // save to disk for subsequent app launches
    //   model.save(asyncStorageIO(keyInAsyncStorage));
    // } catch (error) {
    //   // console.error(error);
    // }
  }
  return model;
}; */

// export {loadModel};

/* 
APPROACH-1
On load-model fn call,
 check if model is bundled with the app
 if bundled, then load from there
 to check if updated model present on server

APPROACH-2
FN load-model
  check if present in asyncStorage
  If present, load from async-storage
  If not present,
    fetch from server
    save in async-storage
  return the loaded model

FN update-model
  remove the model from async-storage
  fetch model from server
  store in server
  return the updated loaded model

APPROACH-3
Expose function such as loadFromDisk, loadFromNW
Some necessary constants
*/
