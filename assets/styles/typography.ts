// src/styles/typography.ts
import { StyleSheet } from 'react-native';
import { FontNames } from '../../constants/fonts';

export default StyleSheet.create({
  regularText: {
    fontFamily: FontNames.Montserrat,
    fontSize: 16,
    color: '#333',
  },
  boldText: {
    fontFamily: FontNames.Montserrat,
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
  },
  mvBoliText: {
    fontFamily: FontNames.MVBoli,
    fontSize: 16,
    color: '#333',
  },
});
