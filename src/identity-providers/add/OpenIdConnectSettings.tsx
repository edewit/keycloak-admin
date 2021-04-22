import React, { useEffect, useState } from "react";
import { useErrorHandler } from "react-error-boundary";
import {
  Button,
  FormGroup,
  Switch,
  TextInput,
  Title,
} from "@patternfly/react-core";

import { HelpItem } from "../../components/help-enabler/HelpItem";
import { useTranslation } from "react-i18next";
import { asyncStateFetch } from "../../context/auth/AdminClient";
import { DiscoveryResultDialog } from "./DiscoveryResultDailog";
import { OIDCConfigurationRepresentation } from "../OIDCConfigurationRepresentation";
import { JsonFileUpload } from "../../components/json-file-upload/JsonFileUpload";
import { useFormContext } from "react-hook-form";

type Result = OIDCConfigurationRepresentation & {
  error: string;
};

export const OpenIdConnectSettings = () => {
  const { t } = useTranslation("identity-providers");
  const errorHandler = useErrorHandler();

  const { setValue } = useFormContext();

  const [discovery, setDiscovery] = useState(true);
  const [discoveryDialogOpen, setDiscoveryDialogOpen] = useState(false);
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<Result>();

  useEffect(() => {
    if (discovering) {
      setDiscovering(!!discoveryUrl);
      if (discoveryUrl)
        return asyncStateFetch(
          async () => {
            try {
              const response = await fetch(discoveryUrl);
              return await response.json();
            } catch (error) {
              return { error };
            }
          },
          (result) => {
            setDiscoveryResult(result);
            setDiscovering(false);
          },
          errorHandler
        );
    }
  }, [discovering]);

  return (
    <>
      <Title headingLevel="h4" size="xl" className="kc-form-panel__title">
        {t("OpenID Connect settings")}
      </Title>
      {discoveryDialogOpen && (
        <DiscoveryResultDialog
          result={discoveryResult!}
          onClose={() => setDiscoveryDialogOpen(false)}
        />
      )}
      <FormGroup
        label={t("useDiscoveryEndpoint")}
        fieldId="kc-discovery-endpoint-switch"
        labelIcon={
          <HelpItem
            helpText="identity-providers-help:useDiscoveryEndpoint"
            forLabel={t("useDiscoveryEndpoint")}
            forID="kc-discovery-endpoint-switch"
          />
        }
      >
        <Switch
          id="kc-discovery-endpoint-switch"
          label={t("common:on")}
          labelOff={t("common:off")}
          isChecked={discovery}
          onChange={setDiscovery}
        />
      </FormGroup>
      {discovery && (
        <FormGroup
          label={t("discoveryEndpoint")}
          fieldId="kc-discovery-endpoint"
          labelIcon={
            <HelpItem
              helpText="identity-providers-help:discoveryEndpoint"
              forLabel={t("discoveryEndpoint")}
              forID="kc-discovery-endpoint"
            />
          }
          validated={
            discoveryResult && discoveryResult.error
              ? "error"
              : !discoveryResult
              ? "default"
              : "success"
          }
          helperTextInvalid={t("noValidMetaDataFound")}
          isRequired
        >
          <TextInput
            type="text"
            id="kc-discovery-endpoint"
            placeholder="https://hostname/.well-known/openid-configuration"
            value={discoveryUrl}
            onChange={setDiscoveryUrl}
            onBlur={() => setDiscovering(!discovering)}
            validated={
              discoveryResult && discoveryResult.error
                ? "error"
                : !discoveryResult
                ? "default"
                : "success"
            }
            customIconUrl={
              discovering
                ? 'data:image/svg+xml;charset=utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"%3E%3Ccircle cx="50" cy="50" fill="none" stroke="%230066cc" stroke-width="10" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"%3E%3CanimateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"%3E%3C/animateTransform%3E%3C/circle%3E%3C/svg%3E'
                : ""
            }
          />
          {!discoveryResult?.error && discoveryUrl && (
            <Button variant="link" onClick={() => setDiscoveryDialogOpen(true)}>
              {t("viewMetaData")}
            </Button>
          )}
        </FormGroup>
      )}
      {!discovery && (
        <FormGroup
          label={t("importConfig")}
          fieldId="kc-import-config"
          labelIcon={
            <HelpItem
              helpText="identity-providers-help:importConfig"
              forLabel={t("importConfig")}
              forID="kc-import-config"
            />
          }
          validated={
            discoveryResult && discoveryResult.error ? "error" : "default"
          }
        >
          <JsonFileUpload
            id="kc-import-config"
            helpText="identity=providers-help:jsonFileUpload"
            hideDefaultPreview
            unWrap
            validated={
              discoveryResult && discoveryResult.error ? "error" : "default"
            }
            onChange={(value) => {
              if (value !== "") {
                try {
                  const config = JSON.parse(value as string);
                  Object.keys(config).map((k) => setValue(k, config[k]));
                } catch (error) {
                  setDiscoveryResult({ error });
                }
              } else {
                setDiscoveryResult(undefined);
              }
            }}
          />
        </FormGroup>
      )}
    </>
  );
};