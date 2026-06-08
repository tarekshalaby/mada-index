import {initializeBlock} from '@airtable/blocks/interface/ui';

function MadaIndex() {
    return (
        <iframe
            src="http://localhost:5173"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
            }}
            title="Mada Index"
        />
    );
}

initializeBlock({interface: () => <MadaIndex />});
