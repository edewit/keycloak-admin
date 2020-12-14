import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  DropdownItem,
  FormGroup,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
  TextArea,
  TextInput,
  ValidatedOptions,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import {
  Controller,
  SubmitHandler,
  useForm,
  UseFormMethods,
} from "react-hook-form";

import RoleRepresentation from "keycloak-admin/lib/defs/roleRepresentation";
import { FormAccess } from "../components/form-access/FormAccess";

import { useAlerts } from "../components/alert/Alerts";
import { ViewHeader } from "../components/view-header/ViewHeader";

import { useAdminClient } from "../context/auth/AdminClient";
import { useConfirmDialog } from "../components/confirm-dialog/ConfirmDialog";
import { RoleAttributes } from "./RoleAttributes";
import { RolesTabs } from "./RealmRoleTabs";

type RoleDetailsType = {
  form: UseFormMethods;
  save: SubmitHandler<RoleRepresentation>;
  editMode: boolean;
};

const RoleDetails = ({ form, save, editMode }: RoleDetailsType) => {
  const { t } = useTranslation("roles");
  const history = useHistory();
  return (
    <FormAccess
      isHorizontal
      onSubmit={form.handleSubmit(save)}
      role="manage-realm"
      className="pf-u-mt-lg"
    >
      <FormGroup
        label={t("roleName")}
        fieldId="kc-name"
        isRequired
        validated={form.errors.name ? "error" : "default"}
        helperTextInvalid={t("common:required")}
      >
        <TextInput
          ref={form.register({ required: true })}
          type="text"
          id="kc-name"
          name="name"
          isReadOnly={editMode}
        />
      </FormGroup>
      <FormGroup label={t("description")} fieldId="kc-description">
        <Controller
          name="description"
          defaultValue=""
          control={form.control}
          rules={{ maxLength: 255 }}
          render={({ onChange, value }) => (
            <TextArea
              type="text"
              validated={
                form.errors.description
                  ? ValidatedOptions.error
                  : ValidatedOptions.default
              }
              id="kc-role-description"
              value={value}
              onChange={onChange}
            />
          )}
        />
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" type="submit">
          {t("common:save")}
        </Button>
        <Button variant="link" onClick={() => history.push("/roles/")}>
          {editMode ? t("common:reload") : t("common:cancel")}
        </Button>
      </ActionGroup>
    </FormAccess>
  );
};

export const RealmRolesForm = () => {
  const { t } = useTranslation("roles");
  const form = useForm<RoleRepresentation>();
  const adminClient = useAdminClient();
  const { addAlert } = useAlerts();
  const history = useHistory();

  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [attributes, setAttributes] = useState({});

  const onAttributesChange = (attributes: {[index: string]: string[]}) => {
    setAttributes(attributes);
  }

  const attributesToArray = (attributes: {
    [key: string]: string }) => {
      if (!attributes ||  Object.keys(attributes).length == 0) {
        return [ {
            key: "",
            value: [""]
          }
        ];
      }
      return Object.keys(attributes || {}).map((key) => ({
        key: key,
        value: [attributes[key]]
      })
    )};

  useEffect(() => {
    (async () => {
      if (id) {
        const fetchedRole = await adminClient.roles.findOneById({ id });
        setAttributes(fetchedRole.attributes);
        setName(fetchedRole.name!);
        setupForm(fetchedRole);
      } else {
        setName(t("createRole"));
      }
    })();
  }, []);

  const setupForm = (role: RoleRepresentation) => {
    Object.entries(role).map((entry) => {
      form.setValue(entry[0], entry[1]);
    });
  };

  const save = async (role: RoleRepresentation) => {
    try {
      if (id) {
        await adminClient.roles.updateById({ id }, role);
      } else {
        await adminClient.roles.create(role);
        const createdRole = await adminClient.roles.findOneByName({
          name: role.name!,
        });
        history.push(`/roles/${createdRole.id}`);
      }
      addAlert(t(id ? "roleSaveSuccess" : "roleCreated"), AlertVariant.success);
    } catch (error) {
      addAlert(
        t((id ? "roleSave" : "roleCreate") + "Error", { error }),
        AlertVariant.danger
      );
    }
  };

  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: "roles:roleDeleteConfirm",
    messageKey: t("roles:roleDeleteConfirmDialog", { name }),
    continueButtonLabel: "common:delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      try {
        await adminClient.roles.delById({ id });
        addAlert(t("roleDeletedSuccess"), AlertVariant.success);
        history.push("/roles");
      } catch (error) {
        addAlert(`${t("roleDeleteError")} ${error}`, AlertVariant.danger);
      }
    },
  });

  return (
    <>
      <DeleteConfirm />
      <ViewHeader
        titleKey={name}
        subKey={id ? "" : "roles:roleCreateExplain"}
        dropdownItems={
          id
            ? [
                <DropdownItem
                  key="action"
                  component="button"
                  onClick={() => toggleDeleteDialog()}
                >
                  {t("deleteRole")}
                </DropdownItem>,
              ]
            : undefined
        }
      />

      <PageSection variant="light">
        {id && (
        <RolesTabs />
        )}
        {!id && <RoleDetails form={form} save={save} editMode={false} />}
      </PageSection>
    </>
  );
};
