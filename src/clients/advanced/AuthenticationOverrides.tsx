import React, { useEffect, useState } from "react";
import { Control, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  FormGroup,
  Select,
  SelectOption,
  SelectVariant,
} from "@patternfly/react-core";

import { FormAccess } from "../../components/form-access/FormAccess";
import { HelpItem } from "../../components/help-enabler/HelpItem";
import {
  asyncStateFetch,
  useAdminClient,
} from "../../context/auth/AdminClient";
import { SaveReset } from "./SaveReset";

type AuthenticationOverridesProps = {
  control: Control<Record<string, any>>;
  save: () => void;
  reset: () => void;
  protocol?: string;
};

export const AuthenticationOverrides = ({
  protocol,
  control,
  save,
  reset,
}: AuthenticationOverridesProps) => {
  const adminClient = useAdminClient();
  const { t } = useTranslation("clients");
  const [flows, setFlows] = useState<JSX.Element[]>([]);
  const [browserFlowOpen, setBrowserFlowOpen] = useState(false);
  const [directGrantOpen, setDirectGrantOpen] = useState(false);

  useEffect(
    () =>
      asyncStateFetch(
        () => adminClient.authenticationManagement.getFlows(),
        (flows) =>
          setFlows([
            <SelectOption key="empty" value="">
              {t("common:choose")}
            </SelectOption>,
            ...flows
              .filter((flow) => flow.providerId !== "client-flow")
              .map((flow) => (
                <SelectOption key={flow.id} value={flow.id}>
                  {flow.alias}
                </SelectOption>
              )),
          ])
      ),
    []
  );

  return (
    <FormAccess role="manage-clients" isHorizontal>
      <FormGroup
        label={t("browserFlow")}
        fieldId="browserFlow"
        labelIcon={
          <HelpItem
            helpText="clients-help:browserFlow"
            forLabel={t("browserFlow")}
            forID="browserFlow"
          />
        }
      >
        <Controller
          name="authenticationFlowBindingOverrides.browser"
          defaultValue=""
          control={control}
          render={({ onChange, value }) => (
            <Select
              toggleId="browserFlow"
              variant={SelectVariant.single}
              onToggle={() => setBrowserFlowOpen(!browserFlowOpen)}
              isOpen={browserFlowOpen}
              onSelect={(_, value) => {
                onChange(value);
                setBrowserFlowOpen(false);
              }}
              selections={[value]}
            >
              {flows}
            </Select>
          )}
        />
      </FormGroup>
      {protocol === "openid-connect" && (
        <FormGroup
          label={t("directGrant")}
          fieldId="directGrant"
          labelIcon={
            <HelpItem
              helpText="clients-help:directGrant"
              forLabel={t("directGrant")}
              forID="directGrant"
            />
          }
        >
          <Controller
            name="authenticationFlowBindingOverrides.direct_grant"
            defaultValue=""
            control={control}
            render={({ onChange, value }) => (
              <Select
                toggleId="directGrant"
                variant={SelectVariant.single}
                onToggle={() => setDirectGrantOpen(!directGrantOpen)}
                isOpen={directGrantOpen}
                onSelect={(_, value) => {
                  onChange(value);
                  setDirectGrantOpen(false);
                }}
                selections={[value]}
              >
                {flows}
              </Select>
            )}
          />
        </FormGroup>
      )}
      <SaveReset name="authenticationOverrides" save={save} reset={reset} />
    </FormAccess>
  );
};
