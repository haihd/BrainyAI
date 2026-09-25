import React, {useState} from 'react';
import {Button, Input, List, message, Switch} from 'antd';
import {disableSite, enableSite, setDisabledAllSites, useSiteAccess} from "~utils/site-access";

/** Accepts "example.com", "https://example.com/path" or "sub.example.com:8080" and returns the hostname. */
function toHostname(input: string): string | null {
    const value = input.trim();
    if (!value) {
        return null;
    }
    try {
        return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`).hostname || null;
    } catch {
        return null;
    }
}

export default function WebsitesPage() {
    const access = useSiteAccess();
    const [newSite, setNewSite] = useState('');
    const showOnWebsites = access.loaded && !access.disabledAllSites;

    const addSite = async () => {
        const hostname = toHostname(newSite);
        if (!hostname) {
            void message.warning('Enter a website, e.g. example.com');
            return;
        }
        await disableSite(hostname);
        setNewSite('');
    };

    return (
        <div
            className={'bg-white shadow-[0_4px_12px_0px_rgba(0,0,0,.2)] overflow-hidden rounded-tl-[24px] rounded-tr-[24px] px-[56px] py-[32px] mt-[32px] flex flex-col'}>
            <div className={'text-[#333333] font-[700] text-[20px]'}>Websites</div>
            <div className={'text-[#5E5E5E] text-[13px] mt-[4px]'}>
                Choose where BrainyAI shows its selection toolbar and page buttons. The side panel keeps working everywhere.
            </div>

            <div className={'p-4'}>
                <div className={'border border-[#EEEEEE] rounded-[12px] px-[20px] py-[16px] mb-[16px] flex items-center justify-between'}>
                    <div>
                        <div className={'text-[#333333] font-[600] text-[15px]'}>Show BrainyAI on websites</div>
                        <div className={'text-[#8C8C8C] text-[13px]'}>
                            {access.disabledAllSites ? 'Off on all websites.' : 'On, except for the websites below.'}
                        </div>
                    </div>
                    <Switch id="show-on-websites" checked={showOnWebsites} disabled={!access.loaded}
                        // Tailwind's preflight clears button backgrounds, so set the track color here
                        style={{backgroundColor: showOnWebsites ? '#0A4DFE' : '#BFBFBF'}}
                        onChange={(checked) => void setDisabledAllSites(!checked)}/>
                </div>

                <div className={'border border-[#EEEEEE] rounded-[12px] px-[20px] py-[16px]'}>
                    <div className={'text-[#333333] font-[600] text-[15px] mb-[12px]'}>Disabled websites</div>
                    <div className={'flex gap-[8px] mb-[12px]'}>
                        <Input id="new-disabled-site" placeholder="example.com" value={newSite}
                            onChange={(e) => setNewSite(e.target.value)} onPressEnter={() => void addSite()}/>
                        <Button onClick={() => void addSite()}>Disable</Button>
                    </div>
                    <List
                        size="small"
                        bordered
                        locale={{emptyText: 'No disabled websites.'}}
                        dataSource={access.disabledSites}
                        renderItem={(site) => (
                            <List.Item actions={[
                                <Button key="enable" type="link" size="small" onClick={() => void enableSite(site)}>Enable</Button>
                            ]}>
                                {site}
                            </List.Item>
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
