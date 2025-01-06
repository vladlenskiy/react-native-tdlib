/**
 * @format
 */

import 'react-native';
import React from 'react';
import AppBeta from '../App-Beta';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<AppBeta />);
});
