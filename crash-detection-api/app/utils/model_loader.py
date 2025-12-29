"""
Custom H5 model loader for autoencoder without TensorFlow dependency.
This implementation uses h5py and numpy to load and run the autoencoder model.
"""
import h5py
import numpy as np
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


class SimpleDenseLayer:
    """Simple dense layer implementation"""

    def __init__(self, weights, biases, activation=None):
        self.weights = weights
        self.biases = biases
        self.activation = activation

    def forward(self, x):
        output = np.dot(x, self.weights) + self.biases
        if self.activation == 'relu':
            output = np.maximum(0, output)
        elif self.activation == 'sigmoid':
            output = 1 / (1 + np.exp(-np.clip(output, -500, 500)))
        elif self.activation == 'tanh':
            output = np.tanh(output)
        elif self.activation == 'linear' or self.activation is None:
            pass  # no activation
        return output


class SimpleAutoencoder:
    """Simple autoencoder model loaded from H5 file"""

    def __init__(self, model_path: str):
        self.layers = []
        self.load_model(model_path)

    def load_model(self, model_path: str):
        """Load model weights from H5 file"""
        try:
            with h5py.File(model_path, 'r') as f:
                logger.info(f"Loading model from {model_path}")

                # Try to find layer weights in the H5 file
                # H5 structure can vary, so we'll try common patterns
                if 'model_weights' in f:
                    model_weights_group = f['model_weights']
                    self._load_from_group(model_weights_group)
                elif 'layers' in f:
                    layers_group = f['layers']
                    self._load_from_layers_group(layers_group)
                else:
                    # Try to load directly from root
                    self._load_from_group(f)

            logger.info(f"Model loaded successfully with {len(self.layers)} layers")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def _load_from_group(self, group):
        """Load weights from a group"""
        layer_names = [key for key in group.keys() if 'dense' in key.lower()]
        layer_names = sorted(layer_names)

        for idx, layer_name in enumerate(layer_names):
            layer_group = group[layer_name]
            weights_data = None
            biases_data = None
            activation = 'relu'  # Default activation

            # Navigate through the nested structure: dense_X/sequential_Y/dense_X/
            try:
                # Try structure: dense_X/sequential_Y/dense_X/kernel and bias
                for subgroup_name in layer_group.keys():
                    if 'sequential' in subgroup_name or 'model' in subgroup_name:
                        subgroup = layer_group[subgroup_name]
                        if layer_name in subgroup:
                            weight_group = subgroup[layer_name]
                            if 'kernel' in weight_group:
                                weights_data = np.array(weight_group['kernel'])
                            if 'bias' in weight_group:
                                biases_data = np.array(weight_group['bias'])
                            break

                if weights_data is None:
                    # Alternative: try direct access
                    if layer_name in layer_group:
                        weight_group = layer_group[layer_name]
                        if 'kernel' in weight_group:
                            weights_data = np.array(weight_group['kernel'])
                        if 'bias' in weight_group:
                            biases_data = np.array(weight_group['bias'])

                if weights_data is not None and biases_data is not None:
                    # Last layer typically has linear activation (output layer)
                    if idx == len(layer_names) - 1:
                        activation = 'linear'

                    layer = SimpleDenseLayer(weights_data, biases_data, activation)
                    self.layers.append(layer)
                    logger.info(f"Loaded layer {layer_name}: weights{weights_data.shape} -> bias{biases_data.shape}, activation={activation}")

            except Exception as e:
                logger.warning(f"Failed to load layer {layer_name}: {e}")

    def _load_from_layers_group(self, layers_group):
        """Alternative loading method for different H5 structure"""
        for key in sorted(layers_group.keys()):
            layer_group = layers_group[key]
            if 'weights' in layer_group:
                weights_group = layer_group['weights']
                if len(weights_group.keys()) >= 2:
                    weight_names = sorted(weights_group.keys())
                    weights_data = np.array(weights_group[weight_names[0]])
                    biases_data = np.array(weights_group[weight_names[1]])

                    activation = 'relu' if len(self.layers) < len(layers_group.keys()) - 1 else 'linear'
                    layer = SimpleDenseLayer(weights_data, biases_data, activation)
                    self.layers.append(layer)
                    logger.info(f"Loaded layer from {key}: {weights_data.shape} -> {biases_data.shape}")

    def predict(self, x, verbose=0):
        """Forward pass through the autoencoder"""
        if len(self.layers) == 0:
            raise RuntimeError("No layers loaded in model")

        output = x
        for i, layer in enumerate(self.layers):
            output = layer.forward(output)
            if verbose > 0:
                logger.debug(f"Layer {i} output shape: {output.shape}")

        return output
