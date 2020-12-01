import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  IFormatter,
  IFormatterValueType,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
} from "@patternfly/react-table";
import {
  AlertVariant,
  Button,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  Select,
  Spinner,
  Split,
  SplitItem,
} from "@patternfly/react-core";
import { FilterIcon } from "@patternfly/react-icons";
import ClientScopeRepresentation from "keycloak-admin/lib/defs/clientScopeRepresentation";
import KeycloakAdminClient from "keycloak-admin";

import { useAdminClient } from "../../context/auth/AdminClient";
import { TableToolbar } from "../../components/table-toolbar/TableToolbar";
import { ListEmptyState } from "../../components/list-empty-state/ListEmptyState";
import { AddScopeDialog } from "./AddScopeDialog";
import {
  clientScopeTypesSelectOptions,
  ClientScopeType,
  ClientScope,
} from "./ClientScopeTypes";
import { useAlerts } from "../../components/alert/Alerts";

export type ClientScopesProps = {
  clientId: string;
  protocol: string;
};

const firstUpperCase = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1);

const castAdminClient = (adminClient: KeycloakAdminClient) =>
  (adminClient.clients as unknown) as {
    [index: string]: Function;
  };

const changeScope = async (
  adminClient: KeycloakAdminClient,
  clientId: string,
  clientScope: ClientScopeRepresentation,
  type: ClientScopeType,
  changeTo: ClientScopeType
) => {
  await removeScope(adminClient, clientId, clientScope, type);
  await addScope(adminClient, clientId, clientScope, changeTo);
};

const removeScope = async (
  adminClient: KeycloakAdminClient,
  clientId: string,
  clientScope: ClientScopeRepresentation,
  type: ClientScopeType
) => {
  const typeToName = firstUpperCase(type);
  await castAdminClient(adminClient)[`del${typeToName}ClientScope`]({
    id: clientId,
    clientScopeId: clientScope.id!,
  });
};

const addScope = async (
  adminClient: KeycloakAdminClient,
  clientId: string,
  clientScope: ClientScopeRepresentation,
  type: ClientScopeType
) => {
  const typeToName = firstUpperCase(type);
  await castAdminClient(adminClient)[`add${typeToName}ClientScope`]({
    id: clientId,
    clientScopeId: clientScope.id!,
  });
};

type CellDropdownProps = {
  clientScope: ClientScopeRepresentation;
  type: ClientScopeType;
  onSelect: (value: ClientScopeType) => void;
};

const CellDropdown = ({ clientScope, type, onSelect }: CellDropdownProps) => {
  const { t } = useTranslation("clients");
  const [open, setOpen] = useState(false);

  return (
    <Select
      key={clientScope.id}
      onToggle={() => setOpen(!open)}
      isOpen={open}
      selections={[type]}
      onSelect={(_, value) => {
        onSelect(value as ClientScopeType);
        setOpen(false);
      }}
    >
      {clientScopeTypesSelectOptions(t)}
    </Select>
  );
};

type SearchType = "client" | "assigned";

type TableRow = {
  selected: boolean;
  clientScope: ClientScopeRepresentation;
  type: ClientScopeType;
  cells: (string | undefined)[];
};

export const ClientScopes = ({ clientId, protocol }: ClientScopesProps) => {
  const { t } = useTranslation("clients");
  const adminClient = useAdminClient();
  const { addAlert } = useAlerts();

  const [searchToggle, setSearchToggle] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>("client");
  const [addToggle, setAddToggle] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [rows, setRows] = useState<TableRow[]>();
  const [rest, setRest] = useState<ClientScopeRepresentation[]>();

  const loader = async () => {
    const defaultClientScopes = await adminClient.clients.listDefaultClientScopes(
      { id: clientId }
    );
    const optionalClientScopes = await adminClient.clients.listOptionalClientScopes(
      { id: clientId }
    );
    const clientScopes = await adminClient.clientScopes.find();

    const find = (id: string) =>
      clientScopes.find((clientScope) => id === clientScope.id)!;

    const optional = optionalClientScopes.map((c) => {
      const scope = find(c.id!);
      return {
        selected: false,
        clientScope: c,
        type: ClientScope.optional,
        cells: [c.name, c.id, scope.description],
      };
    });

    const defaultScopes = defaultClientScopes.map((c) => {
      const scope = find(c.id!);
      return {
        selected: false,
        clientScope: c,
        type: ClientScope.default,
        cells: [c.name, c.id, scope.description],
      };
    });

    const data = [...optional, ...defaultScopes];
    setRows(data);
    const names = data.map((row) => row.cells[0]);

    console.log("set rest");
    setRest(
      clientScopes
        .filter((scope) => !names.includes(scope.name))
        .filter((scope) => scope.protocol === protocol)
    );
  };

  useEffect(() => {
    loader();
  }, []);

  const dropdown = (): IFormatter => (data?: IFormatterValueType) => {
    if (!data) {
      return <></>;
    }
    const row = rows?.find((row) => row.clientScope.id === data.toString())!;
    return (
      <CellDropdown
        clientScope={row.clientScope}
        type={row.type}
        onSelect={async (value) => {
          try {
            await changeScope(
              adminClient,
              clientId,
              row.clientScope,
              row.type,
              value
            );
            addAlert(t("clientScopeSuccess"), AlertVariant.success);
            await loader();
          } catch (error) {
            addAlert(t("clientScopeError", { error }), AlertVariant.danger);
          }
        }}
      />
    );
  };

  const filterData = () => {};

  return (
    <>
      {!rows && (
        <div className="pf-u-text-align-center">
          <Spinner />
        </div>
      )}

      {rest && (
        <AddScopeDialog
          clientScopes={rest}
          open={addDialogOpen}
          toggleDialog={() => setAddDialogOpen(!addDialogOpen)}
          onAdd={async (scopes) => {
            try {
              await Promise.all(
                scopes.map(
                  async (scope) =>
                    await addScope(
                      adminClient,
                      clientId,
                      scope.scope,
                      scope.type
                    )
                )
              );
              addAlert(t("clientScopeSuccess"), AlertVariant.success);
              loader();
            } catch (error) {
              addAlert(t("clientScopeError", { error }), AlertVariant.danger);
            }
          }}
        />
      )}

      {rows && rows.length > 0 && (
        <TableToolbar
          searchTypeComponent={
            <Dropdown
              toggle={
                <DropdownToggle
                  id="toggle-id"
                  onToggle={() => setSearchToggle(!searchToggle)}
                >
                  <FilterIcon /> {t(`clientScopeSearch.${searchType}`)}
                </DropdownToggle>
              }
              aria-label="Select Input"
              isOpen={searchToggle}
              dropdownItems={[
                <DropdownItem
                  key="client"
                  onClick={() => {
                    setSearchType("client");
                    setSearchToggle(false);
                  }}
                >
                  {t("clientScopeSearch.client")}
                </DropdownItem>,
                <DropdownItem
                  key="assigned"
                  onClick={() => {
                    setSearchType("assigned");
                    setSearchToggle(false);
                  }}
                >
                  {t("clientScopeSearch.assigned")}
                </DropdownItem>,
              ]}
            />
          }
          inputGroupName="clientsScopeToolbarTextInput"
          inputGroupPlaceholder={t("searchByName")}
          inputGroupOnChange={filterData}
          toolbarItem={
            <Split hasGutter>
              <SplitItem>
                <Button onClick={() => setAddDialogOpen(true)}>
                  {t("addClientScope")}
                </Button>
              </SplitItem>
              <SplitItem>
                <Select
                  id="add-dropdown"
                  key="add-dropdown"
                  isOpen={addToggle}
                  selections={[]}
                  placeholderText={t("changeTypeTo")}
                  onToggle={() => setAddToggle(!addToggle)}
                  onSelect={async (_, value) => {
                    try {
                      await Promise.all(
                        rows.map((row) => {
                          if (row.selected) {
                            return changeScope(
                              adminClient,
                              clientId,
                              row.clientScope,
                              row.type,
                              value as ClientScope
                            );
                          }
                          return Promise.resolve();
                        })
                      );
                      setAddToggle(false);
                      await loader();
                      addAlert(t("clientScopeSuccess"), AlertVariant.success);
                    } catch (error) {
                      addAlert(
                        t("clientScopeError", { error }),
                        AlertVariant.danger
                      );
                    }
                  }}
                >
                  {clientScopeTypesSelectOptions(t)}
                </Select>
              </SplitItem>
            </Split>
          }
        >
          <Table
            onSelect={(_, isSelected, rowIndex) => {
              if (rowIndex === -1) {
                setRows(
                  rows.map((row) => {
                    row.selected = isSelected;
                    return row;
                  })
                );
              } else {
                rows[rowIndex].selected = isSelected;
                setRows([...rows]);
              }
            }}
            variant={TableVariant.compact}
            cells={[
              t("name"),
              { title: t("assignedType"), cellFormatters: [dropdown()] },
              t("description"),
            ]}
            rows={rows}
            actions={[
              {
                title: t("common:remove"),
                onClick: async (_, rowId) => {
                  try {
                    await removeScope(
                      adminClient,
                      clientId,
                      rows[rowId].clientScope,
                      rows[rowId].type
                    );
                    addAlert(
                      t("clientScopeRemoveSuccess"),
                      AlertVariant.success
                    );
                    loader();
                  } catch (error) {
                    addAlert(
                      t("clientScopeRemoveError", { error }),
                      AlertVariant.danger
                    );
                  }
                },
              },
            ]}
            aria-label={t("clientScopeList")}
          >
            <TableHeader />
            <TableBody />
          </Table>
        </TableToolbar>
      )}
      {rows && rows.length === 0 && (
        <ListEmptyState
          message={t("clients:emptyClientScopes")}
          instructions={t("clients:emptyClientScopesInstructions")}
          primaryActionText={t("clients:emptyClientScopesPrimaryAction")}
          onPrimaryAction={() => setAddDialogOpen(true)}
        />
      )}
    </>
  );
};
