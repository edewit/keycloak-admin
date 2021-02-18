import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Controller, useFormContext } from "react-hook-form";
import moment from "moment";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  Card,
  CardBody,
  ExpandableSection,
  FormGroup,
  Split,
  SplitItem,
  Text,
  TextInput,
  ToolbarItem,
} from "@patternfly/react-core";

import GlobalRequestResult from "keycloak-admin/lib/defs/globalRequestResult";
import ClientRepresentation from "keycloak-admin/lib/defs/clientRepresentation";
import { convertToFormValues, toUpperCase } from "../util";
import { FormAccess } from "../components/form-access/FormAccess";
import { ScrollForm } from "../components/scroll-form/ScrollForm";
import { HelpItem } from "../components/help-enabler/HelpItem";
import { KeycloakDataTable } from "../components/table-toolbar/KeycloakDataTable";
import { FineGrainOpenIdConnect } from "./advanced/FineGrainOpenIdConnect";
import { OpenIdConnectCompatibilityModes } from "./advanced/OpenIdConnectCompatibilityModes";
import { AdvancedSettings } from "./advanced/AdvancedSettings";
import { TimeSelector } from "../components/time-selector/TimeSelector";
import { useAdminClient } from "../context/auth/AdminClient";
import { useAlerts } from "../components/alert/Alerts";
import { useConfirmDialog } from "../components/confirm-dialog/ConfirmDialog";
import { AddHostDialog } from "./advanced/AddHostDialog";
import { FineGrainSamlEndpointConfig } from "./advanced/FineGrainSamlEndpointConfig";
import { AuthenticationOverrides } from "./advanced/AuthenticationOverrides";
import { useRealm } from "../context/realm-context/RealmContext";

type AdvancedProps = {
  save: () => void;
  client: ClientRepresentation;
};

export const AdvancedTab = ({
  save,
  client: { id, registeredNodes, attributes, protocol },
}: AdvancedProps) => {
  const { t } = useTranslation("clients");
  const adminClient = useAdminClient();
  const { realm } = useRealm();
  const { addAlert } = useAlerts();
  const revocationFieldName = "notBefore";
  const openIdConnect = "openid-connect";

  const { getValues, setValue, register, control } = useFormContext();
  const [expanded, setExpanded] = useState(false);
  const [selectedNode, setSelectedNode] = useState("");
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [key, setKey] = useState(0);
  const refresh = () => setKey(new Date().getTime());
  const [nodes, setNodes] = useState(registeredNodes || {});

  const setNotBefore = (time: number) => {
    setValue(revocationFieldName, time);
    save();
  };

  const parseResult = (result: GlobalRequestResult, prefixKey: string) => {
    const successCount = result.successRequests?.length || 0;
    const failedCount = result.failedRequests?.length || 0;

    if (successCount === 0 && failedCount === 0) {
      addAlert(t("noAdminUrlSet"), AlertVariant.warning);
    } else if (failedCount > 0) {
      addAlert(
        t(prefixKey + "Success", { successNodes: result.successRequests }),
        AlertVariant.success
      );
      addAlert(
        t(prefixKey + "Fail", { failedNodes: result.failedRequests }),
        AlertVariant.danger
      );
    } else {
      addAlert(
        t(prefixKey + "Success", { successNodes: result.successRequests }),
        AlertVariant.success
      );
    }
  };

  const push = async () => {
    const result = ((await adminClient.clients.pushRevocation({
      id: id!,
    })) as unknown) as GlobalRequestResult;
    parseResult(result, "notBeforePush");
  };

  const testCluster = async () => {
    const result = await adminClient.clients.testNodesAvailable({ id: id! });
    parseResult(result, "testCluster");
  };

  const [toggleDeleteNodeConfirm, DeleteNodeConfirm] = useConfirmDialog({
    titleKey: "clients:deleteNode",
    messageKey: t("deleteNodeBody", {
      node: selectedNode,
    }),
    continueButtonLabel: "common:delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      try {
        await adminClient.clients.deleteClusterNode({
          id: id!,
          node: selectedNode,
        });
        setNodes({
          ...Object.keys(nodes).reduce((object: any, key) => {
            if (key !== selectedNode) {
              object[key] = nodes[key];
            }
            return object;
          }, {}),
        });
        refresh();
        addAlert(t("deleteNodeSuccess"), AlertVariant.success);
      } catch (error) {
        addAlert(
          t("deleteNodeFail", { error: error.response?.data?.error || error }),
          AlertVariant.danger
        );
      }
    },
  });

  useEffect(() => {
    register(revocationFieldName);
  }, [register]);

  const formatDate = () => {
    const date = getValues(revocationFieldName);
    if (date > 0) {
      return moment(date * 1000).format("LLL");
    } else {
      return t("none");
    }
  };

  const sections = [
    t("revocation"),
    t("clustering"),
    protocol === openIdConnect
      ? t("fineGrainOpenIdConnectConfiguration")
      : t("fineGrainSamlEndpointConfig"),
    t("advancedSettings"),
    t("authenticationOverrides"),
  ];
  if (protocol === openIdConnect) {
    sections.splice(3, 0, t("openIdConnectCompatibilityModes"));
  }

  return (
    <ScrollForm sections={sections}>
      <Card>
        <CardBody>
          <Text>
            <Trans i18nKey="clients-help:notBeforeIntro">
              In order to successfully push setup url on
              <Link to={`/${realm}/clients/${id}/settings`}>
                {t("settings")}
              </Link>
              tab
            </Trans>
          </Text>
        </CardBody>
        <CardBody>
          <FormAccess role="manage-clients" isHorizontal>
            <FormGroup
              label={t("notBefore")}
              fieldId="kc-not-before"
              labelIcon={
                <HelpItem
                  helpText="clients-help:notBefore"
                  forLabel={t("notBefore")}
                  forID="kc-not-before"
                />
              }
            >
              <TextInput
                type="text"
                id="kc-not-before"
                name="notBefore"
                isReadOnly
                value={formatDate()}
              />
            </FormGroup>
            <ActionGroup>
              <Button
                id="setToNow"
                variant="tertiary"
                onClick={() => setNotBefore(moment.now() / 1000)}
              >
                {t("setToNow")}
              </Button>
              <Button
                id="clear"
                variant="tertiary"
                onClick={() => setNotBefore(0)}
              >
                {t("clear")}
              </Button>
              <Button id="push" variant="secondary" onClick={push}>
                {t("push")}
              </Button>
            </ActionGroup>
          </FormAccess>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <FormAccess role="manage-clients" isHorizontal>
            <FormGroup
              label={t("nodeReRegistrationTimeout")}
              fieldId="kc-node-reregistration-timeout"
              labelIcon={
                <HelpItem
                  helpText="clients-help:nodeReRegistrationTimeout"
                  forLabel={t("nodeReRegistrationTimeout")}
                  forID="nodeReRegistrationTimeout"
                />
              }
            >
              <Split hasGutter>
                <SplitItem>
                  <Controller
                    name="nodeReRegistrationTimeout"
                    defaultValue=""
                    control={control}
                    render={({ onChange, value }) => (
                      <TimeSelector value={value} onChange={onChange} />
                    )}
                  />
                </SplitItem>
                <SplitItem>
                  <Button variant={ButtonVariant.secondary} onClick={save}>
                    {t("common:save")}
                  </Button>
                </SplitItem>
              </Split>
            </FormGroup>
          </FormAccess>
        </CardBody>
        <CardBody>
          <DeleteNodeConfirm />
          <AddHostDialog
            clientId={id!}
            isOpen={addNodeOpen}
            onAdded={(node) => {
              nodes[node] = moment.now() / 1000;
              refresh();
            }}
            onClose={() => setAddNodeOpen(false)}
          />
          <ExpandableSection
            toggleText={t("registeredClusterNodes")}
            onToggle={() => setExpanded(!expanded)}
            isExpanded={expanded}
          >
            <KeycloakDataTable
              key={key}
              ariaLabelKey="registeredClusterNodes"
              loader={() =>
                Promise.resolve(
                  Object.entries(nodes || {}).map((entry) => {
                    return { host: entry[0], registration: entry[1] };
                  })
                )
              }
              toolbarItem={
                <>
                  <ToolbarItem>
                    <Button
                      id="testClusterAvailability"
                      onClick={testCluster}
                      variant={ButtonVariant.secondary}
                      isDisabled={Object.keys(nodes).length === 0}
                    >
                      {t("testClusterAvailability")}
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      id="registerNodeManually"
                      onClick={() => setAddNodeOpen(true)}
                      variant={ButtonVariant.tertiary}
                    >
                      {t("registerNodeManually")}
                    </Button>
                  </ToolbarItem>
                </>
              }
              actions={[
                {
                  title: t("common:delete"),
                  onRowClick: (node) => {
                    setSelectedNode(node.host);
                    toggleDeleteNodeConfirm();
                  },
                },
              ]}
              columns={[
                {
                  name: "host",
                  displayKey: "clients:nodeHost",
                },
                {
                  name: "registration",
                  displayKey: "clients:lastRegistration",
                  cellFormatters: [
                    (value) =>
                      value
                        ? moment(parseInt(value.toString()) * 1000).format(
                            "LLL"
                          )
                        : "",
                  ],
                },
              ]}
            />
          </ExpandableSection>
        </CardBody>
      </Card>
      <Card>
        {protocol === openIdConnect && (
          <>
            <CardBody>
              <Text>
                {t("clients-help:fineGrainOpenIdConnectConfiguration")}
              </Text>
            </CardBody>
            <CardBody>
              <FineGrainOpenIdConnect
                control={control}
                save={save}
                reset={() =>
                  convertToFormValues(attributes, "attributes", setValue)
                }
              />
            </CardBody>
          </>
        )}
        {protocol !== openIdConnect && (
          <>
            <CardBody>
              <Text>{t("clients-help:fineGrainSamlEndpointConfig")}</Text>
            </CardBody>

            <CardBody>
              <FineGrainSamlEndpointConfig
                control={control}
                save={save}
                reset={() =>
                  convertToFormValues(attributes, "attributes", setValue)
                }
              />
            </CardBody>
          </>
        )}
      </Card>
      {protocol === openIdConnect && (
        <Card>
          <CardBody>
            <Text>{t("clients-help:openIdConnectCompatibilityModes")}</Text>
          </CardBody>
          <CardBody>
            <OpenIdConnectCompatibilityModes
              control={control}
              save={save}
              reset={() =>
                setValue(
                  "attributes.exclude_session_state_from_auth_response",
                  attributes
                    ? attributes["exclude.session.state.from.auth.response"]
                    : ""
                )
              }
            />
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody>
          <Text>
            {t("clients-help:advancedSettings" + toUpperCase(protocol!))}
          </Text>
        </CardBody>
        <CardBody>
          <AdvancedSettings
            protocol={protocol}
            control={control}
            save={save}
            reset={() => {}}
          />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Text>{t("clients-help:authenticationOverrides")}</Text>
        </CardBody>
        <CardBody>
          <AuthenticationOverrides
            protocol={protocol}
            control={control}
            save={save}
            reset={() => {}}
          />
        </CardBody>
      </Card>
    </ScrollForm>
  );
};