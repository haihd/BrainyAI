import React from 'react';
import {DndProvider} from "react-dnd";
import {HTML5Backend} from "react-dnd-html5-backend";
import ApiKeyPage from '~options/component/ApiKeyPage';

export default function ShortcutMenu() {
    return <div>
        <DndProvider backend={HTML5Backend}>
            <ApiKeyPage/>
        </DndProvider>
    </div>;
}
