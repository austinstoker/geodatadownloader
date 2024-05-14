import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { useCallback, useEffect, useState } from "react";
import * as React from "react";
import type { } from "@mui/x-data-grid/themeAugmentation";
import { StatusAlert, useStatusAlert } from "./StatusAlert";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { setLoadingWhile } from "./loading";
import { Autocomplete, IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

export type Status = "not_started" | "loading" | "error" | "loaded";

export type PickLayerProps = {
  defaultLayerUrl: string;
  onLayerLoad: (layer: FeatureLayer) => void;
};


type RecentUrls = {
  urls: RecentUrl[]
}

type RecentUrl = {
  url: string
}

function addRecentUrl(urls: RecentUrls, newUrl: RecentUrl): RecentUrls {
  urls.urls = urls.urls.filter((url) => url.url !== newUrl.url)
  return { urls: [newUrl, ...urls.urls] }
}

export function PickLayer({ defaultLayerUrl, onLayerLoad }: PickLayerProps) {
  const [loading, setLoading] = useState(false);
  const [alertProps, setAlertProps] = useStatusAlert("", undefined);
  const [url, setUrl] = useState(defaultLayerUrl);

  const [recentUrls, setRecentUrls] = useState(() => {
    return JSON.parse(localStorage.getItem("recent_urls") ?? `{"urls": []}`) as RecentUrls
  })

  const recentUrlsMemod = React.useMemo(() => recentUrls?.urls?.map(u => u.url) ?? [], [recentUrls])


  useEffect(() => {
    localStorage.setItem("recent_urls", JSON.stringify(recentUrls))
  }, [recentUrls])

  const loadLayer = useCallback(
    async (layerUrl: string) => {
      await setLoadingWhile(async () => {
        try {
          const url = new URL(layerUrl)
          const strippedUrl = url.protocol + "//" + url.hostname + url.pathname
          console.log(strippedUrl)
          const layer = new FeatureLayer({
            url: strippedUrl,
          });
          await layer.load();
          setAlertProps("", undefined);
          onLayerLoad(layer);
          setRecentUrls(urls => addRecentUrl(urls, { url: layerUrl }))
        } catch (e) {
          const err = e as Error;
          setAlertProps(`${err.message}`, "error");
        }
      }, setLoading);
    },
    [onLayerLoad, setAlertProps, setLoading]
  );

  useEffect(() => {
    if (defaultLayerUrl) {
      void loadLayer(defaultLayerUrl);
    }
  }, [defaultLayerUrl, loadLayer]);

  function onLoadClick() {
    void loadLayer(url);
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onLoadClick();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem 1rem",
        marginTop: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: "1rem 1rem",
        }}
      >
        <Autocomplete
          options={recentUrlsMemod}
          value={url}
          freeSolo
          onChange={(_, value) => setUrl(value ?? "")}
          fullWidth
          //@ts-ignore
          renderOption={(props) =>
            <SavedLayerListItem
              props={props}
              url={props.key}
              onDelete={() => setRecentUrls(recents => ({ urls: recents.urls.filter(r => r.url !== props.key) }))}
              onClick={() => setUrl(props.key)}
            />
          }
          renderInput={(params) =>
            <TextField
              {...params}
              id="layer-url"
              required
              fullWidth
              label="Layer Url"
              placeholder="https://gismaps.kingcounty.gov/arcgis/rest/services/Environment/KingCo_SensitiveAreas/MapServer/11"
              onKeyPress={handleKeyPress}
              onChange={(e) => setUrl(e.currentTarget.value ?? "")}
            />
          }
        />
        <Button
          disabled={!url}
          id="load-layer"
          variant="contained"
          onClick={onLoadClick}
        >
          Load
        </Button>
      </div>
      <Box>
        <StatusAlert loading={loading} {...alertProps} />
      </Box>
    </div>
  );
}

type SavedLayerListItemParams<T> = {
  props: T
  url: string
  onDelete: () => void
  onClick: () => void
}

function SavedLayerListItem<T>({ url, onDelete, onClick, props }: SavedLayerListItemParams<T>) {
  const [clicked, setClicked] = useState(false)
  return (
    <Box component="li" {...props}>
      <div onClick={onClick} style={{ display: "flex", flexGrow: 1 }}>
        {url}
      </div>
      <IconButton onClick={onDelete}>
        <DeleteIcon htmlColor={clicked ? "red" : undefined} />
      </IconButton>
    </Box>
  )
}
