import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  PageSection,
  Select,
  SelectOption,
  SelectVariant,
  Switch,
  TextInput,
} from "@patternfly/react-core";

import { ViewHeader } from "../../components/view-header/ViewHeader";
import { HttpClientContext } from "../../context/http-service/HttpClientContext";
import { RealmContext } from "../../context/realm-context/RealmContext";
import { ProtocolMapperRepresentation } from "../models/client-scope";
import { Controller, useForm } from "react-hook-form";
import { useConfirmDialog } from "../../components/confirm-dialog/ConfirmDialog";
import { useAlerts } from "../../components/alert/Alerts";
import { HelpItem } from "../../components/help-enabler/HelpItem";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { ConfigPropertyRepresentation } from "../../context/server-info/server-info";

export const MappingDetails = () => {
  const { t } = useTranslation("client-scopes");
  const httpClient = useContext(HttpClientContext)!;
  const { realm } = useContext(RealmContext);
  const { addAlert } = useAlerts();

  const { scopeId, id } = useParams<{ scopeId: string; id: string }>();
  const { register, setValue, control, handleSubmit } = useForm();
  const [mapping, setMapping] = useState<ProtocolMapperRepresentation>();
  const [typeOpen, setTypeOpen] = useState(false);
  const [configProperties, setConfigProperties] = useState<
    ConfigPropertyRepresentation[]
  >();

  const serverInfo = useServerInfo();
  const url = `/admin/realms/${realm}/client-scopes/${scopeId}/protocol-mappers/models/${id}`;

  useEffect(() => {
    (async () => {
      const response = await httpClient.doGet<ProtocolMapperRepresentation>(
        url
      );
      if (response.data) {
        Object.entries(response.data).map((entry) => {
          if (entry[0] === "config") {
            Object.keys(entry[1]).map((key) => {
              const newKey = key.replace(/\./g, "_");
              setValue("config." + newKey, entry[1][key]);
            });
          }
          setValue(entry[0], entry[1]);
        });
      }
      setMapping(response.data);
      const mapperTypes =
        serverInfo.protocolMapperTypes[response.data!.protocol!];
      const properties = mapperTypes.find(
        (type) => type.id === mapping?.protocolMapper
      )?.properties;
      setConfigProperties(properties);
    })();
  }, []);

  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: "client-scopes:deleteMappingTitle",
    messageKey: "client-scopes:deleteMappingConfirm",
    continueButtonLabel: "common:delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: () => {
      try {
        httpClient.doDelete(url);
        addAlert(t("mappingDeletedSuccess"), AlertVariant.success);
      } catch (error) {
        addAlert(t("mappingDeletedError", { error }), AlertVariant.danger);
      }
    },
  });

  const save = async (formMapping: ProtocolMapperRepresentation) => {
    const keyValues = Object.keys(formMapping.config!).map((key) => {
      const newKey = key.replace(/_/g, ".");
      return { [newKey]: formMapping.config![key] };
    });

    const map = { ...mapping, config: Object.assign({}, ...keyValues) };
    try {
      await httpClient.doPut(url, map);
      addAlert(t("mappingUpdatedSuccess"), AlertVariant.success);
    } catch (error) {
      addAlert(t("mappingUpdatedError", { error }), AlertVariant.danger);
    }
  };

  return (
    <>
      <DeleteConfirm />
      <ViewHeader
        titleKey={mapping ? mapping.name! : ""}
        subKey={id}
        badge={mapping?.protocol}
        selectItems={[
          <SelectOption key="delete" value="delete">
            {t("common:delete")}
          </SelectOption>,
        ]}
        onSelect={toggleDeleteDialog}
      />
      <PageSection variant="light">
        <Form isHorizontal onSubmit={handleSubmit(save)}>
          <FormGroup
            label={t("realmRolePrefix")}
            labelIcon={
              <HelpItem
                helpText="client-scopes-help:prefix"
                forLabel={t("realmRolePrefix")}
                forID="prefix"
              />
            }
            fieldId="prefix"
          >
            <TextInput
              ref={register()}
              type="text"
              id="prefix"
              name="config.usermodel_realmRoleMapping_rolePrefix"
            />
          </FormGroup>
          <FormGroup
            label={t("multiValued")}
            labelIcon={
              <HelpItem
                helpText="client-scopes-help:multiValued"
                forLabel={t("multiValued")}
                forID="multiValued"
              />
            }
            fieldId="multiValued"
          >
            <Controller
              name="config.multivalued"
              control={control}
              defaultValue="false"
              render={({ onChange, value }) => (
                <Switch
                  id="multiValued"
                  label={t("common:on")}
                  labelOff={t("common:off")}
                  isChecked={value === "true"}
                  onChange={(value) => onChange("" + value)}
                />
              )}
            />
          </FormGroup>
          <FormGroup
            label={t("tokenClaimName")}
            labelIcon={
              <HelpItem
                helpText="client-scopes-help:tokenClaimName"
                forLabel={t("tokenClaimName")}
                forID="claimName"
              />
            }
            fieldId="claimName"
          >
            <TextInput
              ref={register()}
              type="text"
              id="claimName"
              name="config.claim_name"
            />
          </FormGroup>
          <FormGroup
            label={t("claimJsonType")}
            labelIcon={
              <HelpItem
                helpText="client-scopes-help:claimJsonType"
                forLabel={t("claimJsonType")}
                forID="claimJsonType"
              />
            }
            fieldId="claimJsonType"
          >
            <Controller
              name="config.jsonType_label"
              defaultValue=""
              control={control}
              render={({ onChange, value }) => (
                <Select
                  toggleId="claimJsonType"
                  onToggle={() => setTypeOpen(!typeOpen)}
                  onSelect={(_, value) => {
                    onChange(value as string);
                    setTypeOpen(false);
                  }}
                  selections={value}
                  variant={SelectVariant.single}
                  aria-label={t("claimJsonType")}
                  isOpen={typeOpen}
                >
                  {configProperties &&
                    configProperties
                      .find((property) => property.name === "jsonType.label")
                      ?.options.map((option) => (
                        <SelectOption
                          selected={option === value}
                          key={option}
                          value={option}
                        />
                      ))}
                </Select>
              )}
            />
          </FormGroup>
          <FormGroup
            hasNoPaddingTop
            label={t("addClaimTo")}
            fieldId="addClaimTo"
          >
            <Flex>
              <FlexItem>
                <Controller
                  name="config.id_token_claim"
                  defaultValue={false}
                  control={control}
                  render={({ onChange, value }) => (
                    <Checkbox
                      label={t("idToken")}
                      id="idToken"
                      isChecked={value}
                      onChange={onChange}
                    />
                  )}
                />
              </FlexItem>
              <FlexItem>
                <Controller
                  name="config.access_token_claim"
                  defaultValue={false}
                  control={control}
                  render={({ onChange, value }) => (
                    <Checkbox
                      label={t("accessToken")}
                      id="accessToken"
                      isChecked={value}
                      onChange={onChange}
                    />
                  )}
                />
              </FlexItem>
              <FlexItem>
                <Controller
                  name="config.userinfo_token_claim"
                  defaultValue={false}
                  control={control}
                  render={({ onChange, value }) => (
                    <Checkbox
                      label={t("userInfo")}
                      id="userInfo"
                      isChecked={value}
                      onChange={onChange}
                    />
                  )}
                />
              </FlexItem>
            </Flex>
          </FormGroup>
          <ActionGroup>
            <Button variant="primary" type="submit">
              {t("common:save")}
            </Button>
            <Button variant="link">{t("common:cancel")}</Button>
          </ActionGroup>
        </Form>
      </PageSection>
    </>
  );
};
