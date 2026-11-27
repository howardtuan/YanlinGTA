import React from 'react';
import { Composition } from 'remotion';
import { Promo, TOTAL } from './Promo';
import { Promo3, TOTAL3 } from './Promo3';
import { FPS } from './theme';

export const Root: React.FC = () => (
  <>
    <Composition
      id="YanlinPromo"
      component={Promo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ bgm: true }}
    />
    <Composition
      id="YanlinPromo3"
      component={Promo3}
      durationInFrames={TOTAL3}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ bgm: true }}
    />
  </>
);
