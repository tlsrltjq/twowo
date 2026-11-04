import { useEffect, useState } from 'react';
import { Image, ImageResizeMode, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

import { resolvePhotoUri } from './index';

/** fsphoto 참조·data URL·http URL 을 이미지 주소로 바꿔 준다. 푸는 동안·실패 시 null. */
export function usePhotoUri(source: string | null | undefined): string | null {
  const [uri, setUri] = useState<string | null>(() =>
    source && !source.startsWith('fsphoto:') ? source : null,
  );

  useEffect(() => {
    let alive = true;
    resolvePhotoUri(source)
      .then(u => { if (alive) setUri(u); })
      .catch((e) => {
        console.error('[photos] 사진을 불러오지 못했어요', e);
        if (alive) setUri(null);
      });
    return () => { alive = false; };
  }, [source]);

  return uri;
}

/** 사진 참조를 그대로 받아 그린다. 아직 못 불러왔으면 같은 크기의 빈 칸(placeholderStyle)을 둔다. */
export function PhotoImage({
  source, style, resizeMode = 'cover', placeholderStyle,
}: {
  source: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  placeholderStyle?: StyleProp<ViewStyle>;
}) {
  const uri = usePhotoUri(source);
  if (!uri) return <View style={[style as StyleProp<ViewStyle>, placeholderStyle]} />;
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
