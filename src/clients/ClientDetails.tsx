import React, { useEffect, useState } from "react";
import {
  AlertVariant,
  ButtonVariant,
  DropdownItem,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
} from "@patternfly/react-core";
import { useParams } from "react-router-dom";
import { useErrorHandler } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import ClientRepresentation from "keycloak-admin/lib/defs/clientRepresentation";

import { ClientSettings } from "./ClientSettings";
import { useAlerts } from "../components/alert/Alerts";
import { useConfirmDialog } from "../components/confirm-dialog/ConfirmDialog";
import { DownloadDialog } from "../components/download-dialog/DownloadDialog";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useAdminClient, asyncStateFetch } from "../context/auth/AdminClient";
import { Credentials } from "./credentials/Credentials";
import {
  convertFormValuesToObject,
  convertToFormValues,
  exportClient,
} from "../util";
import {
  convertToMultiline,
  MultiLine,
  toValue,
} from "../components/multi-line-input/MultiLineInput";
import { ClientScopes } from "./scopes/ClientScopes";
import { EvaluateScopes } from "./scopes/EvaluateScopes";
import { RolesList } from "../realm-roles/RolesList";
import { ServiceAccount } from "./service-account/ServiceAccount";
import { KeycloakTabs } from "../components/keycloak-tabs/KeycloakTabs";
import { AdvancedTab } from "./AdvancedTab";

type ClientDetailHeaderProps = {
  onChange: (value: boolean) => void;
  value: boolean;
  save: () => void;
  client: ClientRepresentation;
  toggleDownloadDialog: () => void;
  toggleDeleteDialog: () => void;
};

const ClientDetailHeader = ({
  onChange,
  value,
  save,
  client,
  toggleDownloadDialog,
  toggleDeleteDialog,
}: ClientDetailHeaderProps) => {
  const { t } = useTranslation("clients");
  const [toggleDisableDialog, DisableConfirm] = useConfirmDialog({
    titleKey: "clients:disableConfirmTitle",
    messageKey: "clients:disableConfirm",
    continueButtonLabel: "common:disable",
    onConfirm: () => {
      onChange(!value);
      save();
    },
  });
  return (
    <>
      <DisableConfirm />
      <ViewHeader
        titleKey={client ? client.clientId! : ""}
        subKey="clients:clientsExplain"
        dropdownItems={[
          <DropdownItem key="download" onClick={() => toggleDownloadDialog()}>
            {t("downloadAdapterConfig")}
          </DropdownItem>,
          <DropdownItem key="export" onClick={() => exportClient(client)}>
            {t("common:export")}
          </DropdownItem>,
          <DropdownItem key="delete" onClick={() => toggleDeleteDialog()}>
            {t("common:delete")}
          </DropdownItem>,
        ]}
        isEnabled={value}
        onToggle={(value) => {
          if (!value) {
            toggleDisableDialog();
          } else {
            onChange(value);
            save();
          }
        }}
      />
    </>
  );
};

export type ClientForm = Omit<ClientRepresentation, "redirectUris"> & {
  redirectUris: MultiLine[];
};

export const ClientDetails = () => {
  const { t } = useTranslation("clients");
  const adminClient = useAdminClient();
  const handleError = useErrorHandler();

  const { addAlert } = useAlerts();
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const toggleDownloadDialog = () => setDownloadDialogOpen(!downloadDialogOpen);

  const form = useForm<ClientForm>();
  const publicClient = useWatch({
    control: form.control,
    name: "publicClient",
    defaultValue: false,
  });

  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientRepresentation>();

  const loader = async () => {
    const roles = await adminClient.clients.listRoles({ id });
    return roles.sort((r1, r2) => {
      const r1Name = r1.name?.toUpperCase();
      const r2Name = r2.name?.toUpperCase();
      if (r1Name! < r2Name!) {
        return -1;
      }
      if (r1Name! > r2Name!) {
        return 1;
      }

      return 0;
    });
  };

  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: "clients:clientDeleteConfirmTitle",
    messageKey: "clients:clientDeleteConfirm",
    continueButtonLabel: "common:delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      try {
        await adminClient.clients.del({ id });
        addAlert(t("clientDeletedSuccess"), AlertVariant.success);
      } catch (error) {
        addAlert(`${t("clientDeleteError")} ${error}`, AlertVariant.danger);
      }
    },
  });

  const setupForm = (client: ClientRepresentation) => {
    const { redirectUris, ...formValues } = client;
    form.reset(formValues);
    Object.entries(client).map((entry) => {
      if (entry[0] === "redirectUris" || entry[0] === "webOrigins") {
        form.setValue(entry[0], convertToMultiline(redirectUris!));
      } else if (entry[0] === "attributes") {
        convertToFormValues(entry[1], "attributes", form.setValue);
      } else {
        form.setValue(entry[0], entry[1]);
      }
    });
  };

  useEffect(() => {
    return asyncStateFetch(
      () => adminClient.clients.findOne({ id }),
      (fetchedClient) => {
        setClient(fetchedClient);
        setupForm(fetchedClient);
      },
      handleError
    );
  }, [id]);

  const save = async () => {
    if (await form.trigger()) {
      const redirectUris = toValue(form.getValues()["redirectUris"]);
      const webOrigins = toValue(form.getValues()["webOrigins"]);
      const attributes = convertFormValuesToObject(
        form.getValues()["attributes"]
      );

      try {
        const client: ClientRepresentation = {
          ...form.getValues(),
          redirectUris,
          webOrigins,
          attributes,
          id,
        };
        await adminClient.clients.update({ id }, client);
        setupForm(client);
        setClient(client);
        addAlert(t("clientSaveSuccess"), AlertVariant.success);
      } catch (error) {
        addAlert(`${t("clientSaveError")} '${error}'`, AlertVariant.danger);
      }
    }
  };

  if (!client) {
    return (
      <div className="pf-u-text-align-center">
        <Spinner />
      </div>
    );
  }
  return (
    <>
      <DeleteConfirm />
      <DownloadDialog
        id={client.id!}
        protocol={client.protocol}
        open={downloadDialogOpen}
        toggleDialog={toggleDownloadDialog}
      />
      <Controller
        name="enabled"
        control={form.control}
        defaultValue={true}
        render={({ onChange, value }) => (
          <ClientDetailHeader
            value={value}
            onChange={onChange}
            client={client}
            save={save}
            toggleDeleteDialog={toggleDeleteDialog}
            toggleDownloadDialog={toggleDownloadDialog}
          />
        )}
      />
      <PageSection variant="light">
        <FormProvider {...form}>
          <KeycloakTabs isBox>
            <Tab
              id="settings"
              eventKey="settings"
              title={<TabTitleText>{t("common:settings")}</TabTitleText>}
            >
              <ClientSettings save={save} />
            </Tab>
            {publicClient && (
              <Tab
                id="credentials"
                eventKey="credentials"
                title={<TabTitleText>{t("credentials")}</TabTitleText>}
              >
                <Credentials clientId={id} save={save} />
              </Tab>
            )}
            <Tab
              id="roles"
              eventKey="roles"
              title={<TabTitleText>{t("roles")}</TabTitleText>}
            >
              <RolesList loader={loader} paginated={false} />
            </Tab>
            <Tab
              id="clientScopes"
              eventKey="clientScopes"
              title={<TabTitleText>{t("clientScopes")}</TabTitleText>}
            >
              <KeycloakTabs paramName="subtab" isSecondary>
                <Tab
                  id="setup"
                  eventKey="setup"
                  title={<TabTitleText>{t("setup")}</TabTitleText>}
                >
                  <ClientScopes clientId={id} protocol={client!.protocol!} />
                </Tab>
                <Tab
                  id="evaluate"
                  eventKey="evaluate"
                  title={<TabTitleText>{t("evaluate")}</TabTitleText>}
                >
                  <EvaluateScopes clientId={id} protocol={client!.protocol!} />
                </Tab>
              </KeycloakTabs>
            </Tab>
            {client!.serviceAccountsEnabled && (
              <Tab
                id="serviceAccount"
                eventKey="serviceAccount"
                title={<TabTitleText>{t("serviceAccount")}</TabTitleText>}
              >
                <ServiceAccount clientId={id} />
              </Tab>
            )}
            <Tab
              id="advanced"
              eventKey="advanced"
              title={<TabTitleText>{t("advanced")}</TabTitleText>}
            >
              <AdvancedTab save={save} client={client} />
            </Tab>
          </KeycloakTabs>
        </FormProvider>
      </PageSection>
    </>
  );
};
