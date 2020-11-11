import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GroupsList } from "./GroupsList";
import { GroupsCreateModal } from "./GroupsCreateModal";
import {
  ServerGroupsArrayRepresentation,
  ServerGroupMembersRepresentation,
} from "./models/server-info";
import { TableToolbar } from "../components/table-toolbar/TableToolbar";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { ListEmptyState } from "../components/list-empty-state/ListEmptyState";
import { RealmContext } from "../components/realm-context/RealmContext";
import { AdminClient } from "../auth/AdminClient";
import { RealmContext } from "../context/realm-context/RealmContext";
import { useAlerts } from "../components/alert/Alerts";
import {
  Button,
  Dropdown,
  DropdownItem,
  KebabToggle,
  PageSection,
  PageSectionVariants,
  Spinner,
  ToolbarItem,
  AlertVariant,
} from "@patternfly/react-core";
import "./GroupsSection.css";

export const GroupsSection = () => {
  const { t } = useTranslation("groups");
  const httpClient = useContext(AdminClient)!;
  const [rawData, setRawData] = useState<{ [key: string]: any }[]>();
  const [filteredData, setFilteredData] = useState<{ [key: string]: any }[]>();
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tableRowSelectedArray, setTableRowSelectedArray] = useState<
    Array<number>
  >([]);
  const columnID: keyof GroupRepresentation = "id";
  const membersLength: keyof GroupRepresentation = "membersLength";
  const columnGroupName: keyof GroupRepresentation = "name";
  const { addAlert } = useAlerts();
  const { realm } = useContext(RealmContext);

  const loader = async () => {
      const groupsData = await httpClient.groups.find({ first, max, realm });
    const getMembers = async (id: number) => {
      const response = await httpClient.doGet<
        ServerGroupMembersRepresentation[]
      >(`/admin/realms/${realm}/groups/${id}/members`);
      const responseData = response.data!;
      return responseData.length;
    };

    const memberPromises = groupsData.map((group: { [key: string]: any }) =>
      getMembers(group[columnID])
    );
    const memberData = await Promise.all(memberPromises);
    const updatedObject = groupsData.map(
      (group: { [key: string]: any }, i: number) => {
        const object = Object.assign({}, group);
        object[membersLength] = memberData[i];
        return object;
      }
    );
    setFilteredData(updatedObject);
    setRawData(updatedObject);
  };

  useEffect(() => {
    loader();
  }, []);

  // Filter groups
  const filterGroups = (newInput: string) => {
    const localRowData = rawData!.filter((obj: { [key: string]: string }) => {
      const groupName = obj[columnGroupName];
      return groupName.toLowerCase().includes(newInput.toLowerCase());
    });
    setFilteredData(localRowData);
  };

  // Kebab delete action
  const onKebabToggle = (isOpen: boolean) => {
    setIsKebabOpen(isOpen);
  };

  const onKebabSelect = () => {
    setIsKebabOpen(!isKebabOpen);

  const handleModalToggle = () => {
    setIsCreateModalOpen(!isCreateModalOpen);
  };

  const multiDelete = async () => {
    if (tableRowSelectedArray.length !== 0) {
      const deleteGroup = async (rowId: number) => {
        try {
          await httpClient.doDelete(
            `/admin/realms/${realm}/groups/${
              filteredData ? filteredData![rowId].id : rawData![rowId].id
            }`
          );
          loader();
        } catch (error) {
          addAlert(`${t("groupDeleteError")} ${error}`, AlertVariant.danger);
        }
      };

      const chainedPromises = tableRowSelectedArray.map((rowId: number) => {
        deleteGroup(rowId);
      });

      await Promise.all(chainedPromises)
        .then(() => addAlert(t("groupsDeleted"), AlertVariant.success))
        .then(() => setTableRowSelectedArray([]));
    }
  };

  return (
    <>
      <ViewHeader titleKey="groups:groups" subKey="groups:groupsDescription" />
      <PageSection variant={PageSectionVariants.light}>
        {!rawData && (
          <div className="pf-u-text-align-center">
            <Spinner />
          </div>
        )}
        {rawData && rawData.length > 0 ? (
          <>
            <TableToolbar
              inputGroupName="groupsToolbarTextInput"
              inputGroupPlaceholder={t("searchGroups")}
              inputGroupOnChange={filterGroups}
              toolbarItem={
                <>
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      onClick={() => handleModalToggle()}
                    >
                      {t("createGroup")}
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Dropdown
                      onSelect={onKebabSelect}
                      toggle={<KebabToggle onToggle={onKebabToggle} />}
                      isOpen={isKebabOpen}
                      isPlain
                      dropdownItems={[
                        <DropdownItem
                          key="action"
                          component="button"
                          onClick={() => multiDelete()}
                        >
                          {t("common:Delete")}
                        </DropdownItem>,
                      ]}
                    />
                  </ToolbarItem>
                </>
              }
            >
              {rawData && (
                <GroupsList
                  list={filteredData ? filteredData : rawData}
                  refresh={loader}
                  tableRowSelectedArray={tableRowSelectedArray}
                  setTableRowSelectedArray={setTableRowSelectedArray}
                />
              )}
              {filteredData && filteredData.length === 0 && (
                <ListEmptyState
                  hasIcon={true}
                  isSearchVariant={true}
                  message={t("noSearchResults")}
                  instructions={t("noSearchResultsInstructions")}
                />
              )}
            </TableToolbar>
          </>
        ) : (
          <ListEmptyState
            hasIcon={true}
            message={t("noGroupsInThisRealm")}
            instructions={t("noGroupsInThisRealmInstructions")}
            primaryActionText={t("createGroup")}
            onPrimaryAction={() => handleModalToggle()}
          />
        )}
        <GroupsCreateModal
          isCreateModalOpen={isCreateModalOpen}
          handleModalToggle={handleModalToggle}
          setIsCreateModalOpen={setIsCreateModalOpen}
          createGroupName={createGroupName}
          setCreateGroupName={setCreateGroupName}
          refresh={loader}
        />
      </PageSection>
    </>
  );
};
