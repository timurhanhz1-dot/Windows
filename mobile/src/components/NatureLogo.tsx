import React from 'react';
import Svg, { Path, Text } from 'react-native-svg';

interface Props { size?: number; }

export const NatureLogo = ({ size = 48 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path
      d="M50 5C35 20 15 40 15 60C15 78 30 95 50 95C70 95 85 78 85 60C85 40 65 20 50 5Z"
      fill="#4ADE80"
    />
    <Text
      x="50"
      y="70"
      fontSize="55"
      fontWeight="900"
      fill="white"
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
    >
      N
    </Text>
  </Svg>
);
