/*
 * Copyright (C) 2020 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useCallback, useState} from 'react'
import {PresentationContent} from '@instructure/ui-a11y-content'
import {Billboard} from '@instructure/ui-billboard'
import {Flex} from '@instructure/ui-flex'
import {Spinner} from '@instructure/ui-spinner'
import {Text} from '@instructure/ui-text'
import {View} from '@instructure/ui-view'
import I18n from 'i18n!OutcomeManagement'
import SVGWrapper from '@canvas/svg-wrapper'
import ManageOutcomesView from './ManageOutcomesView'
import ManageOutcomesFooter from './ManageOutcomesFooter'
import useSearch from '@canvas/outcomes/react/hooks/useSearch'
import TreeBrowser from './TreeBrowser'
import {useManageOutcomes} from '@canvas/outcomes/react/treeBrowser'
import useCanvasContext from '@canvas/outcomes/react/hooks/useCanvasContext'
import useModal from '@canvas/outcomes/react/hooks/useModal'
import useGroupDetail from '@canvas/outcomes/react/hooks/useGroupDetail'
import useResize from '@canvas/outcomes/react/hooks/useResize'
import useSelectedOutcomes from '@canvas/outcomes/react/hooks/useSelectedOutcomes'
import MoveModal from './MoveModal'
import EditGroupModal from './EditGroupModal'
import GroupDescriptionModal from './GroupDescriptionModal'
import GroupRemoveModal from './GroupRemoveModal'
import OutcomeRemoveModal from './OutcomeRemoveModal'
import OutcomeRemoveMultiModal from './OutcomeRemoveMultiModal'
import OutcomeEditModal from './OutcomeEditModal'
import {moveOutcomeGroup} from '@canvas/outcomes/graphql/Management'
import {showFlashAlert} from '@canvas/alerts/react/FlashAlert'
import startMoveOutcome from '@canvas/outcomes/react/helpers/startMoveOutcome'

const NoOutcomesBillboard = () => {
  const {contextType} = useCanvasContext()
  const isCourse = contextType === 'Course'

  return (
    <div className="management-panel" data-testid="outcomeManagementPanel">
      <Billboard
        size="large"
        headingLevel="h3"
        heading={
          isCourse
            ? I18n.t('Outcomes have not been added to this course yet.')
            : I18n.t('Outcomes have not been added to this account yet.')
        }
        message={
          isCourse
            ? I18n.t('Get started by finding, importing or creating your course outcomes.')
            : I18n.t('Get started by finding, importing or creating your account outcomes.')
        }
        hero={
          <div>
            <PresentationContent>
              <SVGWrapper url="/images/magnifying_glass.svg" />
            </PresentationContent>
          </div>
        }
      />
    </div>
  )
}

const OutcomeManagementPanel = () => {
  const {contextType, contextId} = useCanvasContext()
  const {
    search: searchString,
    debouncedSearch: debouncedSearchString,
    onChangeHandler: onSearchChangeHandler,
    onClearHandler: onSearchClearHandler
  } = useSearch()
  const {setContainerRef, setLeftColumnRef, setDelimiterRef, setRightColumnRef} = useResize()
  const [scrollContainer, setScrollContainer] = useState(null)
  const {selectedOutcomes, selectedOutcomesCount, toggleSelectedOutcomes, clearSelectedOutcomes} =
    useSelectedOutcomes()
  const noop = () => {}
  const {
    error,
    isLoading,
    collections,
    queryCollections,
    rootId,
    selectedGroupId,
    selectedParentGroupId
  } = useManageOutcomes(true)
  const {group, loading, loadMore} = useGroupDetail({
    id: selectedGroupId,
    searchString: debouncedSearchString,
    showAlert: false
  })
  const [isMoveGroupModalOpen, openMoveGroupModal, closeMoveGroupModal] = useModal()
  const [isGroupRemoveModalOpen, openGroupRemoveModal, closeGroupRemoveModal] = useModal()
  const [isEditGroupModalOpen, openEditGroupModal, closeEditGroupModal] = useModal()
  const [isOutcomeEditModalOpen, openOutcomeEditModal, closeOutcomeEditModal] = useModal()
  const [isOutcomeRemoveModalOpen, openOutcomeRemoveModal, closeOutcomeRemoveModal] = useModal()
  const [isOutcomeRemoveMultiModalOpen, openOutcomeRemoveMultiModal, closeOutcomeRemoveMultiModal] =
    useModal()
  const [isOutcomeMoveModalOpen, openOutcomeMoveModal, closeOutcomeMoveModal] = useModal()
  const [isGroupDescriptionModalOpen, openGroupDescriptionModal, closeGroupDescriptionModal] =
    useModal()
  const [selectedOutcome, setSelectedOutcome] = useState(null)

  const onCloseOutcomeRemoveModal = () => {
    closeOutcomeRemoveModal()
    setSelectedOutcome(null)
  }
  const onCloseOutcomeRemoveMultiModal = () => {
    closeOutcomeRemoveMultiModal()
    clearSelectedOutcomes()
  }
  const onCloseOutcomeEditModal = () => {
    closeOutcomeEditModal()
    setSelectedOutcome(null)
  }
  const onCloseOutcomeMoveModal = () => {
    closeOutcomeMoveModal()
    setSelectedOutcome(null)
  }
  const onCloseEditGroupModal = () => {
    closeEditGroupModal()
  }
  const groupMenuHandler = (_, action) => {
    if (action === 'move') {
      openMoveGroupModal()
    } else if (action === 'remove') {
      openGroupRemoveModal()
    } else if (action === 'edit') {
      openEditGroupModal()
    } else if (action === 'description') {
      openGroupDescriptionModal()
    }
  }
  const outcomeMenuHandler = useCallback(
    (id, action) => {
      setSelectedOutcome(group.outcomes.edges.find(edge => edge.node._id === id)?.node)
      if (action === 'remove') {
        openOutcomeRemoveModal()
      } else if (action === 'edit') {
        openOutcomeEditModal()
      } else if (action === 'move') {
        openOutcomeMoveModal()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group]
  )

  const onMoveHandler = async newParentGroup => {
    closeMoveGroupModal()
    try {
      if (!group) {
        return
      }
      await moveOutcomeGroup(contextType, contextId, group._id, newParentGroup.id)
      showFlashAlert({
        message: I18n.t('"%{title}" has been moved to "%{newGroupTitle}".', {
          title: group.title,
          newGroupTitle: newParentGroup.name
        }),
        type: 'success'
      })
    } catch (err) {
      showFlashAlert({
        message: err.message
          ? I18n.t('An error occurred moving group "%{title}": %{message}', {
              title: group.title,
              message: err.message
            })
          : I18n.t('An error occurred moving group "%{title}"', {
              title: group.title
            }),
        type: 'error'
      })
    }
  }

  const onMoveOutcomeHandler = newParentGroup => {
    startMoveOutcome(contextType, contextId, selectedOutcome, selectedGroupId, newParentGroup)
    onCloseOutcomeMoveModal()
  }
  const onRemoveOutcomesHandler = () => {
    // TODO: update backend via GraphQL mutation
    // Depends on: OUT-4499
    onCloseOutcomeRemoveMultiModal()
  }

  if (isLoading) {
    return (
      <div style={{textAlign: 'center'}}>
        <Spinner renderTitle={I18n.t('Loading')} size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Text color="danger">
        {contextType === 'Course'
          ? I18n.t('An error occurred while loading course outcomes: %{error}', {error})
          : I18n.t('An error occurred while loading account outcomes: %{error}', {error})}
      </Text>
    )
  }

  // Currently we're checking the presence of outcomes by checking the presence of folders
  // we need to implement the correct behavior later
  // https://gerrit.instructure.com/c/canvas-lms/+/255898/8/app/jsx/outcomes/Management/index.js#235
  const hasOutcomes = Object.keys(collections).length > 1

  return (
    <div className="management-panel" data-testid="outcomeManagementPanel">
      {!hasOutcomes ? (
        <NoOutcomesBillboard />
      ) : (
        <>
          <Flex elementRef={setContainerRef}>
            <Flex.Item
              width="33%"
              display="inline-block"
              position="relative"
              height="60vh"
              as="div"
              overflowY="auto"
              overflowX="hidden"
              elementRef={setLeftColumnRef}
            >
              <View as="div" padding="small none none x-small">
                <Text size="large" weight="light" fontStyle="normal">
                  {I18n.t('Outcome Groups')}
                </Text>
                <TreeBrowser
                  onCollectionToggle={queryCollections}
                  collections={collections}
                  rootId={rootId}
                />
              </View>
            </Flex.Item>
            <Flex.Item
              as="div"
              position="relative"
              width="1%"
              height="60vh"
              margin="small none none none"
              padding="small none large none"
              display="inline-block"
            >
              <div
                data-testid="handlerRef"
                ref={setDelimiterRef}
                style={{
                  width: '1vw',
                  height: '100%',
                  cursor: 'col-resize',
                  background:
                    '#EEEEEE url("/images/splitpane_handle-ew.gif") no-repeat scroll 50% 50%'
                }}
              />
            </Flex.Item>
            <Flex.Item
              as="div"
              width="66%"
              display="inline-block"
              position="relative"
              height="60vh"
              overflowY="visible"
              overflowX="auto"
              elementRef={el => {
                setRightColumnRef(el)
                setScrollContainer(el)
              }}
            >
              <View as="div" padding="x-small none none x-small">
                {selectedGroupId && (
                  <ManageOutcomesView
                    key={selectedGroupId}
                    outcomeGroup={group}
                    loading={loading}
                    selectedOutcomes={selectedOutcomes}
                    searchString={searchString}
                    onSelectOutcomesHandler={toggleSelectedOutcomes}
                    onOutcomeGroupMenuHandler={groupMenuHandler}
                    onOutcomeMenuHandler={outcomeMenuHandler}
                    onSearchChangeHandler={onSearchChangeHandler}
                    onSearchClearHandler={onSearchClearHandler}
                    loadMore={loadMore}
                    scrollContainer={scrollContainer}
                  />
                )}
              </View>
            </Flex.Item>
          </Flex>
          <hr />
          <>
            <ManageOutcomesFooter
              selected={selectedOutcomes}
              selectedCount={selectedOutcomesCount}
              onRemoveHandler={openOutcomeRemoveMultiModal}
              onMoveHandler={noop}
            />
          </>
          {selectedGroupId && (
            <>
              <MoveModal
                title={loading ? '' : group.title}
                groupId={selectedGroupId}
                parentGroupId={selectedParentGroupId}
                type="group"
                isOpen={isMoveGroupModalOpen}
                onCloseHandler={closeMoveGroupModal}
                onMoveHandler={onMoveHandler}
              />

              <GroupRemoveModal
                groupId={selectedGroupId}
                isOpen={isGroupRemoveModalOpen}
                onCloseHandler={closeGroupRemoveModal}
              />
            </>
          )}
          {selectedGroupId && selectedOutcome && (
            <>
              <OutcomeRemoveModal
                groupId={selectedGroupId}
                outcomeId={selectedOutcome._id}
                isOpen={isOutcomeRemoveModalOpen}
                onCloseHandler={onCloseOutcomeRemoveModal}
              />
              <OutcomeEditModal
                outcome={selectedOutcome}
                isOpen={isOutcomeEditModalOpen}
                onCloseHandler={onCloseOutcomeEditModal}
              />
              <MoveModal
                title={selectedOutcome.title}
                groupId={selectedGroupId}
                parentGroupId={selectedGroupId}
                type="outcome"
                isOpen={isOutcomeMoveModalOpen}
                onCloseHandler={onCloseOutcomeMoveModal}
                onMoveHandler={onMoveOutcomeHandler}
              />
            </>
          )}
          {group && (
            <>
              <EditGroupModal
                outcomeGroup={group}
                isOpen={isEditGroupModalOpen}
                onCloseHandler={onCloseEditGroupModal}
              />
              <GroupDescriptionModal
                outcomeGroup={group}
                isOpen={isGroupDescriptionModalOpen}
                onCloseHandler={closeGroupDescriptionModal}
              />
            </>
          )}
          {selectedOutcomesCount > 0 && (
            <OutcomeRemoveMultiModal
              outcomes={selectedOutcomes}
              isOpen={isOutcomeRemoveMultiModalOpen}
              onCloseHandler={closeOutcomeRemoveMultiModal}
              onRemoveHandler={onRemoveOutcomesHandler}
            />
          )}
        </>
      )}
    </div>
  )
}

export default OutcomeManagementPanel
