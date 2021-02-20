/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
  TextInput,
  Switch,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

import RNFetchBlob from 'rn-fetch-blob';

import {loadFromDisk, loadFromNetwork, saveModelToDisk} from './src/model';

declare const global: {HermesInternal: null | {}};

const defaultModelUrl = 'https://srivalab-compute.cse.iitk.ac.in:5040/ml_models/layers_model//model.json';
const defaultModelName = 'layers-model-1';

const App = () => {
  const [isTfReady, setIsTfReady] = useState<boolean>(false);
  const [model, setModel] = useState<tf.GraphModel | tf.LayersModel>();
  const [modelAvailable, setModelAvailable] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>(defaultModelName);
  const [modelURL, setModelURL] = useState(defaultModelUrl);
  const [isLayersModel, setIsLayersModel] = useState(true);

  const [disableAllBtns, setDisableAllBtns] = useState<boolean>(false);
  const [textView, setTextView] = useState<string>('');

  const toggleSwitch = () =>
    setIsLayersModel((previousState) => !previousState);

  const makeTFReady = async () => {
    await tf.ready();
    setIsTfReady(true);
    tf.enableProdMode();
  };

  useEffect(() => {
    const tmpfn = async () => {
      if (!isTfReady) {
        await makeTFReady();
      }
    };
    tmpfn();
  }, [isTfReady]);

  useEffect(() => {
    if (model !== undefined) {
      setModelAvailable(true);
    } else {
      setModelAvailable(false);
    }
  }, [model]);

  const handleLoadFromServerBtn = async () => {
    setDisableAllBtns(true);

    try {
      let tick = Date.now();
      const modelFromNW = await loadFromNetwork(modelURL, isLayersModel);
      let tock = Date.now();

      setModel(modelFromNW);
      setTextView(`Time to fetch from NW: ${tock - tick} ms`);
    } catch (error) {
      setTextView(error.toString());
    }
    setDisableAllBtns(false);
  };

  const handleLoadFromDiskBtn = async () => {
    setDisableAllBtns(true);

    try {
      let tick = Date.now();
      const modelFromDisk = await loadFromDisk(modelName, isLayersModel);
      let tock = Date.now();

      setModel(modelFromDisk);

      setTextView(`Time to load model from disk : ${tock - tick} ms`);
    } catch (error) {
      setTextView(error.toString());
    }

    setDisableAllBtns(false);
  };

  const handleSaveModelBtn = async () => {
    setDisableAllBtns(true);

    if (!model) {
      setTextView('Model undefined');
      setDisableAllBtns(false);
      return;
    }

    try {
      let tick = Date.now();
      await saveModelToDisk(model, modelName);
      let tock = Date.now();

      setTextView(`Time to save model to disk : ${tock - tick} ms`);
    } catch (error) {
      setTextView(error.toString());
    }

    setDisableAllBtns(false);
  };

  const listFilesInAppStorage = async () => {
    const PATH_SEPARATOR = '/';
    const dirPath = [
      RNFetchBlob.fs.dirs.DocumentDir,
      'tensorflowjs_models',
    ].join(PATH_SEPARATOR);

    let text = [];

    try {
      const dirs = (await RNFetchBlob.fs.lstat(dirPath)).filter(
        (res) => res.type === 'directory',
      );

      for (let dir of dirs) {
        const filesInDir = await RNFetchBlob.fs.lstat(dir.path);

        const filesInfoText = filesInDir.map((file) => {
          return ` -----> ${file.filename}: ${file.size} B`;
        });

        text.push([` -> ${dir.filename}`, ...filesInfoText].join('\n'));
      }

      setTextView(text.join('\n\n'));
    } catch (error) {
      setTextView(error.toString());
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Try model hot-reload</Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text>Model Available: {modelAvailable ? 'True' : 'False'}</Text>
          </View>

          <View style={{...styles.sectionContainer, height: 170}}>
            <Text style={styles.titleText}>Input model name </Text>
            <TextInput
              style={styles.textInput}
              onChangeText={(text) => setModelName(text)}
              value={modelName}
            />
            <Text style={styles.titleText}>Input model url </Text>
            <TextInput
              style={styles.textInput}
              onChangeText={(text) => setModelURL(text)}
              value={modelURL}
            />

            <View style={styles.switchView}>
              <View>
                <Text>Is LayersModel?</Text>
              </View>
              <View>
                <Switch onValueChange={toggleSwitch} value={isLayersModel} />
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.btnContainer}>
              <Button
                title="Load model from server"
                disabled={disableAllBtns}
                onPress={handleLoadFromServerBtn}
              />
            </View>

            <View style={styles.btnContainer}>
              <Button
                title="Load Model from Disk"
                disabled={disableAllBtns}
                onPress={handleLoadFromDiskBtn}
              />
            </View>

            <View style={styles.btnContainer}>
              <Button
                title="Save Model"
                disabled={disableAllBtns || !modelAvailable}
                onPress={handleSaveModelBtn}
              />
            </View>

            <View style={styles.btnContainer}>
              <Button
                title="List App files"
                disabled={disableAllBtns}
                onPress={listFilesInAppStorage}
              />
            </View>
          </View>

          <View style={{...styles.sectionContainer, height: 200}}>
            <Text style={styles.titleText}>Info View</Text>
            <ScrollView style={{width: '90%', padding: 20}}>
              <Text>{textView}</Text>
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  body: {
    // backgroundColor: 'beige',
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    padding: 5,
  },
  sectionContainer: {
    display: 'flex',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
    margin: 5,
  },
  btnContainer: {
    display: 'flex',
    flexDirection: 'column',
    // backgroundColor: 'aqua',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    margin: 5,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  textInput: {
    // backgroundColor: 'lavender',
    fontSize: 15,
    width: '85%',
    borderWidth: 0.5,
    textAlign: 'center',
    // margin: 10,
    padding: 0,
    height: 35,
  },
  switchView: {
    marginTop: 10,
    width: '70%',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },
});

export default App;
